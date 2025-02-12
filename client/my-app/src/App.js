import React from 'react'


import { BrowserRouter, Route, Routes } from 'react-router-dom';
import {ContactPage} from './pages/ContactPage'
import {ContentManagement1} from './pages/ContentManagement1'
import {ContentManagement2} from './pages/ContentManagement2'
import {ContentManagement3} from './pages/ContentManagement3'
import {AdminSalesInvoice} from './pages/AdminSalesInvoice.jsx'
import {HomePage} from './pages/HomePage'
import SignIn from './pages/LoginForm.jsx';
import {SignUp} from './pages/SignUp';
import {EditUserProfile} from './pages/EditUserProfile.jsx';
import NewsletterPopup from './pages/NewsletterPopup'
import Container from 'react-bootstrap/esm/Container.js';
import Calendar from './pages/Calendar.jsx';
import Header from './pages/Header';
import Clock from './pages/Clock.jsx';
import SignOut from './pages/SignOut.jsx';
import Payrollcalculator from './pages/Payrollcalculator'; // Make sure this path matches where you save PayrollCalculator.jsx
import ChatroomPage from './pages/ChatroomPage.jsx';
import{ PhotoUpload  } from './pages/PhotoUpload.jsx';
import { ImageView } from './pages/ImageView.jsx';
import CreateChatrooms from './pages/CreateChatrooms.jsx';
import EditChatrooms from './pages/EditChatrooms.jsx';
import StarRating from './pages/StarRating';
import WriteReviewPage from './pages/WriteReviewPage';
import ReadReview from './pages/ReadReview';
import { NewsletterView } from './pages/NewsletterView.jsx';

//import Header from './pages/Header';
//import CheckBoxWithLabel from './pages/CheckBoxWithLabel.jsx';
import  ManageSubscriber  from './pages/ManageSubscriber';
import AdminUserControl from './pages/AdminUserControl.js';



const App = () => {
  return (
    <Container fluid style={{ paddingLeft: 0, paddingRight: 0 }}>
      <BrowserRouter>
        {/*<Header />*/}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cm1" element={<ContentManagement1 />} />
          <Route path="/ManageSubscriber" element={<ManageSubscriber />} />
          <Route path="/cm2" element={<ManageSubscriber />} />
          <Route path="/cm3" element={<ContentManagement3 />} />
          <Route path="/signup" element={<SignUp />} />    
          <Route path="/edituser" element={<EditUserProfile />} />   
          <Route path="/adminusercontrol" element={<AdminUserControl />} />   
          <Route path="/calendar" element={<Calendar />} />   
          <Route path="/clock" element = {<Clock/>} />
          <Route path='/signout' element = {<SignOut/>}/>
          <Route path="/Payrollcalculator" element={<Payrollcalculator />} />
          <Route path='/chatrooms' element = {<ChatroomPage/>}/>
          <Route path='/PhotoUpload' element = {<PhotoUpload/>}/>
          <Route path='/ImageView' element = {<ImageView/>}/>
          <Route path='/createChatrooms' element = {<CreateChatrooms/>}/>
          <Route path='/starrating' element = {<StarRating/>}/>
          <Route path='/writereviewpage' element = {<WriteReviewPage/>}/>
          <Route path='/readreview' element = {<ReadReview/>}/>
          <Route path='/editChatrooms' element = {<EditChatrooms/>}/>
          <Route path='/invoices' element ={<AdminSalesInvoice/>}/>
          <Route path='/NewsletterView' element ={<NewsletterView/>}/>
          
        </Routes>
      </BrowserRouter>
    </Container>
  );
}

export default App;
