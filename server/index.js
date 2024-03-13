const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const router = express.Router();
const powersRouter = express.Router();
const authRouter = express.Router();
const fs = require('fs');
const fsPromises = require('fs').promises;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const port = 3001
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRouter);
const multer = require('multer');
const {Storage} = require('@google-cloud/storage');
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;
const { ObjectId } = require('mongodb');

const bucket = storage.bucket(bucketName);
const upload = multer({dest: 'uploads/', fileFilter: (req,file,cb) => {
    //Accept Pdfs only
    if(!file.originalname.match(/\.(pdf)$/)) {
        return cb(new Error('Only PDF Files are allowed!'), false);
    }
    cb(null, true);
}});

const uri = process.env.MONGO_URI;
const dbName = '3350';
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const newsletterSender = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '3316lab4@gmail.com',
        pass: 'tedo qnsn iwun lzqt'
    },
});

const timesheetsCollection = client.db(dbName).collection('Timesheets');


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.log('error connecting to DB');
    }
}

run();
const usersCollection = client.db(dbName).collection('Users');
const newslettersCollection = client.db(dbName).collection('Newsletters');


function validateInputSignUp(fullname, password, email, role, isNews) {

    const validRoles = ['Admin', 'User', 'Employee', 'VerifiedUser'];

    if (validRoles.includes(role)) {
        return 'Not Valid Role'
    }

    if (!fullname || !password || !email || !role || isNews == undefined) {
        return 'Please enter all required fields' + isNews;
    }
    if (typeof fullname !== 'string' || typeof password !== 'string' || typeof email !== 'string' ||
        !fullname.trim() || !password.trim() || !email.trim()) {
        return 'Invalid input';
    }
    if (fullname.length > 50 || password.length > 50 || email.length > 100) {
        return 'Input too long';
    }
    return null; // Indicating no error
}

function validateInputSignIn(email, password) {
    if(!email || !password){
        return 'Please enter all required fields';
    }
    if(typeof email !== 'string' || typeof password !== 'string'){
        return 'invalid input type';
    }
    if (email.length > 100 || password.length > 50) {
        return 'Input too long';
    }
    return null; // Indicating no error
}

async function sendVerificationEmail(email, token) {
    const link = `http://localhost:3001/api/auth/verify?token=${token}`;
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: '3316lab4@gmail.com',
            pass: 'tedo qnsn iwun lzqt'
        }
    });

    const mailOptions = {
        from: '3316lab4@gmail.com',
        to: email,
        subject: 'Verify your Account',
        text: `Click on this link to verify your account: ${link}`,
    };

    await transporter.sendMail(mailOptions);
}

authRouter.route('/getuser')
    .get(async (req, res) => {
        try {
            const {email} = req.body;
            const user = await usersCollection.findOne({email});
            res.json(user)
        } catch {
            console.error('Error getting user', error);
            res.status(500).send('Internal server error');
        }
        
});

authRouter.route('/getallusers')
    .get(async (req, res) => {
        try {
            // Fetch all users from the collection
            const users = await usersCollection.find({}).toArray(); // Convert the cursor to an array
            res.json(users); // Send the array of users as a response
        } catch (error) {
            console.error('Error getting users:', error);
            res.status(500).send('Internal server error');
        }
});

const saltRounds = 10; // or another appropriate value for bcrypt

authRouter.route('/editprofile')
  .post(async (req, res) => {
    const { email, fullname, oldp, newp, isNews } = req.body;

    try {
      const user = await usersCollection.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let updatedFields = {
        ...(fullname && { fullname }), // Update fullname if provided
        ...(typeof isNews !== 'undefined' && { isNews }), // Update isNews if provided
      };

      if (oldp && newp) {
        const match = await bcrypt.compare(oldp, user.password);
        if (!match) {
          return res.status(401).json({ message: 'Incorrect password' });
        }

        const newPasswordHash = await bcrypt.hash(newp, saltRounds);
        updatedFields.password = newPasswordHash;
      }

      // Perform the update operation
      const updatedUser = await usersCollection.updateOne({ email }, { $set: updatedFields });

      // Check if the operation was acknowledged, even if no documents were modified
      if (updatedUser.matchedCount === 0) {
        // If no documents matched the query, it's an error
        return res.status(404).json({ message: 'User not found' });
      } else {
        // Operation was acknowledged, return success message
        res.json({ message: 'Profile updated successfully' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });



authRouter.route('/updateuser')
    .post(async (req, res) => {
        try {
            const { fullname, email, isDeactivated, role, isNews} = req.body;  // Destructure the fields from the request body

            // Build the update object based on what's provided in the request
            const updateFields = {};
            if (fullname) updateFields.fullname = fullname;
            if (isDeactivated !== undefined) updateFields.isDeactivated = isDeactivated;
            if (isNews !== undefined) updateFields.isNews = isNews;
            if (role) updateFields.role = role;

            // Ensure we have at least one field to update
            if (Object.keys(updateFields).length === 0) {
                return res.status(400).send('No valid fields provided for update');
            }

            // Update the user in the database
            const result = await usersCollection.updateOne({ email }, { $set: updateFields });

            // Check if a user was found and updated
            if (result.matchedCount === 0) {
                return res.status(404).send('User not found');
            }

            res.status(200).send('User updated successfully');
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).send('Internal server error');
        }
});

authRouter.post('/signin', async (req, res) => {
    try{
        const {email, password} = req.body;
        lowEmail = email.toLowerCase();
        console.log(lowEmail);

        const validationError = validateInputSignIn(lowEmail, password);
        if(validationError) {
            return res.status(400).send(validationError);
        }

        const user = await usersCollection.findOne({ email });
        if(user){
         
            matching = await bcrypt.compare(password, user.password);
            
        }
        
        if(!user || !matching){
            
            return res.status(401).send('incorrect email or password');
            console.log("pass");
        } else {
            console.log("pass");
            return res.status(200).send(user);
        }

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).send('Internal error');
    }
});

authRouter.post('/signup', async (req, res) => {
    try {
        const { fullname, password, email, role, isNews} = req.body;
        lowEmail = email.toLowerCase();

        // Validate input
        const validationError = validateInputSignUp(fullname, password, lowEmail, role, isNews);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        // Check for existing user
        const userExists = await usersCollection.findOne({ lowEmail });
        if (userExists) {
            return res.status(409).send('This email is already in use');
        }

        // Create verification token
        const token = jwt.sign({ lowEmail },process.env.JWT_SECRET_KEY , { expiresIn: '2h' });

        // Send verification email
        await sendVerificationEmail(lowEmail, token);

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        await usersCollection.insertOne({
            fullname,
            password: hashedPassword,
            email: lowEmail,
            isDeactivated: false,            
            role: role,
            isNews: isNews
        });

        res.status(200).send('User successfully registered');
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).send('Internal error');
    }
});

authRouter.route('/verify')
    .get(async (req, res) => {
        try {
            const { token } = req.query;
            if (!token) {
                return res.status(400).send('Token mising');
            }

            jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
                if (err) {
                    return res.status(401).send('Invalid token');
                    
                }   
               
                const email = "hi"

                const result = await usersCollection.updateOne(
                    { email },
                    { $set: { isVerified: true } }
                );
                if (result.matchedCount === 1 && result.modifiedCount === 1) {
                    return res.status(200).send('Account successfully verified');
                }
                else {
                    return res.status(400).send('Invalid token or user already verified');
                }
            });
        } catch (error) {
            
            res.status(500).send('Internal error');
        }
    });

// Assuming authRouter is your express router for authentication related paths
authRouter.get('/newsletter-subscribers', async (req, res) => {
    try {
        const subscribers = await getNewsletterSubscribers();
        res.json(subscribers);
    } catch (error) {
        console.error('Error fetching newsletter subscribers:', error);
        res.status(500).send('Internal server error');
    }
});

async function getNewsletterSubscribers() {
    return await usersCollection.find({ isNews: true }, { projection: { fullname: 1, email: 1 } }).toArray();
}

// Add this route to your authRouter to handle sending newsletters
authRouter.post('/send-newsletter', async (req, res) => {
    // Extract necessary information from the request body
    const { emailSubject, newsletterId } = req.body;

    if (!emailSubject || !newsletterId) {
        return res.status(400).send('Email subject and newsletter ID are required.');
    }

    // Convert the string ID to MongoDB ObjectId
    const _id = new ObjectId(newsletterId);

    // Retrieve the newsletter document from the collection
    const newsletter = await newslettersCollection.findOne({_id});

    if (!newsletter) {
        return res.status(404).send('Newsletter not found.');
    }

    // Extract the PDF URL from the newsletter document
    const pdfPathOrUrl = newsletter.pdfUrl;

    // Fetch the list of subscribers' emails
    const subscribersEmails = await getNewsletterSubscribers();
    
            

    // Check if there are subscribers
    if (subscribersEmails.length === 0) {
        return res.status(404).send('No subscribers found.');
    }

    try {
        // Send the newsletter using the sendNewsletter function
        await sendNewsletter(emailSubject, pdfPathOrUrl, subscribersEmails.map(sub => sub.email));
        

        // Respond with a success message
        res.status(200).send('Newsletter sent successfully to all subscribers.');
    } catch (error) {
        console.error('Failed to send newsletter:', error);
        res.status(500).send('Internal server error occurred while sending the newsletter.');
    }
});




// Endpoint to create a newsletter
authRouter.post('/create-newsletter', upload.single('newsletter'), async (req, res) => {
    const { title, makePublic } = req.body;
    const file = req.file;

    if (!title || !file) {
        return res.status(400).send('Title and PDF file are required!');
    }

    // Generate file name for GCS
    const gcsFileName = `${Date.now()}-${title.replace(/ /g, '_')}.pdf`;
    const gcsFile = bucket.file(gcsFileName);
    
    // Set options for file upload
    const options = {
        destination: gcsFileName,
        metadata: {
            contentType: 'application/pdf',
        },
        // Convert string to boolean for public attribute
        public: makePublic === 'true',
    };

    try {
        await bucket.upload(file.path, options);
        const visibility = makePublic === 'true' ? 'public' : 'private';
        const url = makePublic === 'true' ? `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcsFileName}` : 'Private - Access controlled by GCS bucket settings';

        // Insert metadata into MongoDB, including GCS file name
        const newsletterData = {
            title,
            pdfUrl: url,
            visibility,
            createdAt: new Date(),
            gcsFileName, // Store the GCS file name for future reference
        };
        await newslettersCollection.insertOne(newsletterData);

        // Send the newsletter to all subscribers if makePublic is true
        if (makePublic === 'true') {
            const subscribers = await getNewsletterSubscribers();
            await sendNewsletter(title, file.path, subscribers.map(sub => sub.email));
        }

        res.status(200).send({ message: 'Newsletter uploaded successfully', url, visibility });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).send('Failed to upload PDF');
    }
});

// Endpoint to change newsletter visibility
authRouter.patch('/change-newsletter-visibility', async (req, res) => {
    const { newsletterId, makePublic } = req.body;

    try {
        // Convert string ID to MongoDB ObjectId
        const _id = new ObjectId(newsletterId);
        const newsletter = await newslettersCollection.findOne({_id});

        // Update visibility in MongoDB
        const updatedResult = await newslettersCollection.updateOne(
            { _id },
            { $set: { visibility: makePublic ? 'public' : 'private' } }
        );

        if (updatedResult.modifiedCount === 0) {
            return res.status(404).send('Newsletter not found or no changes made.');
        }

        // Update visibility in GCS
        const gcsFile = bucket.file(newsletter.gcsFileName);
        if (makePublic) {
            await gcsFile.makePublic();
        } else {
            await gcsFile.makePrivate({ strict: true });
        }

        // Get updated URL if the file is public
        const updatedUrl = makePublic ? `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${newsletter.gcsFileName}` : 'Private - Access controlled by GCS bucket settings';

        // If the newsletter is made public, send it to all subscribed users
        if (makePublic) {
            const subscribers = await getNewsletterSubscribers();
            await sendNewsletter(newsletter.title, updatedUrl, subscribers.map(sub => sub.email));
        }

        res.status(200).send({ message: 'Newsletter visibility updated successfully.', url: updatedUrl });
    } catch (error) {
        console.error('Error updating newsletter visibility:', error);
        res.status(500).send('Failed to update newsletter visibility');
    }
});







authRouter.get('/list-newsletters', async (req, res) => {
    // Assuming role is determined by your auth system
    const { role } = req.query; // This could be replaced with your actual authentication logic

    try {
        // Fetch all newsletters for an admin, only public ones for others
        const query = role === 'admin' ? {} : { visibility: 'public' };
        const newsletters = await newslettersCollection.find(query).toArray();

        res.status(200).json(newsletters);
    } catch (error) {
        console.error('Error fetching newsletters:', error);
        res.status(500).send('Failed to fetch newsletters');
    }
});


async function sendNewsletter(emailSubject, pdfPathOrUrl, subscribers){
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: '3316lab4@gmail.com',
            pass: 'tedo qnsn iwun lzqt',
        },
    });

    // Decide if the newsletter is a local file or a hosted URL
    let attachment = fs.existsSync(pdfPathOrUrl) 
        ? {   // Local file
            filename: 'newsletter.pdf',
            path: pdfPathOrUrl 
        } 
        : {   // URL
            filename: 'newsletter.pdf',
            path: pdfPathOrUrl // Assuming this is a direct link to the file
        };

    let mailOptions = {
        from: '3316lab4@gmail.com',
        to: subscribers.join(','),
        subject: emailSubject,
        text: 'Please find the attached newsletter.',
        attachments: [attachment]
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Message Sent: %s', info.messageId);
    } catch (error) {
        console.error('Failed to send newsletter:', error);
    }
}






//utility function to ger subscribers emails .implement according to the database

async function getSubscribersEmails(){
    const subscribers = await usersCollection.find({isNews: true}).toArray();
    console.log(subscribers); // Add this line to check the subscriber list
    return subscribers.map(subscriber => subscriber.email);
}



authRouter.patch('/toggle-newsletter-subscription', async (req, res) => {
    try {
        const { email, isNews } = req.body; // Expecting the user's email and the new isNews status

        if (!email || isNews === undefined) {
            return res.status(400).send('Email and isNews status are required');
        }

        const result = await usersCollection.updateOne(
            { email: email },
            { $set: { isNews: isNews } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send('User not found');
        }

        res.status(200).send(`Newsletter subscription status updated to ${isNews} for ${email}`);
    } catch (error) {
        console.error('Error updating newsletter subscription status:', error);
        res.status(500).send('Internal server error');
    }
});



// This function calculates the start date of the current biweekly period based on the provided date.
const getBiweeklyStartDate = (inputDate) => {
    const current = new Date(inputDate);
    current.setHours(0, 0, 0, 0); // Normalize time to start of the day
    
    // Assuming the biweekly period starts every other Monday (0 in getDay() is Sunday)
    let day = current.getDay();
    let diffToMonday = day === 0 ? -6 : 1 - day; // Calculate difference to last Monday
    let lastMonday = new Date(current);
    lastMonday.setDate(current.getDate() + diffToMonday); // Go back to the last Monday

    // Calculate the week number since a fixed date (e.g., start of the year or another fixed date)
    // Here, we use the start of the current year for simplicity; you might adjust based on your requirements.
    let startOfYear = new Date(Date.UTC(current.getFullYear(), 0, 1)); // Start of the year
    let weeksSinceStartOfYear = Math.ceil(((lastMonday - startOfYear) / (24 * 60 * 60 * 1000) + startOfYear.getDay() + 1) / 7);

    // Adjust lastMonday back one more week if we are currently in an "odd" biweekly period
    if (weeksSinceStartOfYear % 2 === 0) {
        lastMonday.setDate(lastMonday.getDate() - 7);
    }

    return lastMonday;
};
const getBiweeklyEndDate = (inputDate) => {
    const startDate = getBiweeklyStartDate(inputDate);
    let endDate = new Date(startDate); // Create a new Date instance to avoid mutating startDate
    endDate.setDate(startDate.getDate() + 13); // Set to the last day of the biweekly period (14 days total, including the start date)
    return endDate;
};



authRouter.post('/timesheet', async (req, res) => {
    const { email, selectedDate, fullname, startTime, endTime } = req.body;
    const startDate = new Date(`${selectedDate}T${startTime}`);
    const endDate = new Date(`${selectedDate}T${endTime}`);
    const hoursWorked = (endDate - startDate) / (1000 * 60 * 60); // Convert to hours
    const biweeklyStart = getBiweeklyStartDate(selectedDate).toISOString().split('T')[0];
    const biweeklyEnd = getBiweeklyEndDate(selectedDate).toISOString().split('T')[0]; // Implement this function based on your biweekly logic

    try {
        // Find the user's timesheet document
        const timesheet = await timesheetsCollection.findOne({ email: email });

        if (timesheet) {
            // Check if there's already an entry for this biweekly period
            let periodIndex = timesheet.biweeklyPeriods.findIndex(period =>
                period.intervalStart === biweeklyStart && period.intervalEnd === biweeklyEnd);

            if (periodIndex !== -1) {
                // Update the existing biweekly period
                let period = timesheet.biweeklyPeriods[periodIndex];
                period.totalHours += hoursWorked;
                period.logs.push({ date: selectedDate, startTime, endTime, hoursWorked });
                await timesheetsCollection.updateOne({ _id: timesheet._id }, { $set: { [`biweeklyPeriods.${periodIndex}`]: period } });
            } else {
                // Add a new biweekly period
                const newPeriod = {
                    intervalStart: biweeklyStart,
                    intervalEnd: biweeklyEnd,
                    totalHours: hoursWorked,
                    logs: [{ date: selectedDate, startTime, endTime, hoursWorked }]
                };
                await timesheetsCollection.updateOne({ _id: timesheet._id }, { $push: { biweeklyPeriods: newPeriod } });
            }
        } else {
            // Create a new timesheet document for the user
            const newTimesheet = {
                email,
                fullname,
                biweeklyPeriods: [{
                    intervalStart: biweeklyStart,
                    intervalEnd: biweeklyEnd,
                    totalHours: hoursWorked,
                    logs: [{ date: selectedDate, startTime, endTime, hoursWorked }]
                }]
            };
            await timesheetsCollection.insertOne(newTimesheet);
        }

        res.status(200).json({ message: 'Timesheet updated successfully' });
    } catch (error) {
        console.error('Error updating timesheet:', error);
        res.status(500).send('Internal server error');
    }
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

