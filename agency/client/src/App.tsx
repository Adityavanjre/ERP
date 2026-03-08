import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ChatWidget from './components/ChatWidget';
const Home = lazy(() => import('./pages/Home'));
const Services = lazy(() => import('./pages/Services'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Photography = lazy(() => import('./pages/Photography'));
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Legal = lazy(() => import('./pages/Legal'));
const Order = lazy(() => import('./pages/Order'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogDetails = lazy(() => import('./pages/BlogDetails'));
const Careers = lazy(() => import('./pages/Careers'));
const Apply = lazy(() => import('./pages/Apply'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminRoute = lazy(() => import('./components/AdminRoute'));
const Dashboard = lazy(() => import('./pages/Admin/Dashboard'));
const AddProject = lazy(() => import('./pages/Admin/AddProject'));
const ManageProjects = lazy(() => import('./pages/Admin/ManageProjects'));
const ManageEnquiries = lazy(() => import('./pages/Admin/ManageEnquiries'));
const ManageBlogs = lazy(() => import('./pages/Admin/ManageBlogs'));
const AddBlog = lazy(() => import('./pages/Admin/AddBlog'));
const EditBlog = lazy(() => import('./pages/Admin/EditBlog'));
const ManageCareers = lazy(() => import('./pages/Admin/ManageCareers'));
const AddJob = lazy(() => import('./pages/Admin/AddJob'));
const EditProject = lazy(() => import('./pages/Admin/EditProject'));
const ManageUsers = lazy(() => import('./pages/Admin/ManageUsers'));

import ScrollProgress from './components/ScrollProgress';
import CookieConsent from './components/CookieConsent';

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/admin') || location.pathname === '/login';

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-sans">
      <ScrollProgress />
      <CookieConsent />
      {!isAuthPage && <Header />}
      <ScrollToTop />
      {!isAuthPage && <ChatWidget />}
      <AnimatePresence mode="wait">
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/photography" element={<Photography />} />
            <Route path="/project/:id" element={<ProjectDetails />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/order" element={<Order />} />
            <Route path="/resources" element={<Blog />} />
            <Route path="/insights/:id" element={<BlogDetails />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/apply" element={<Apply />} />

            <Route path="/login" element={<Login />} />

            <Route path="/admin" element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="add-project" element={<AddProject />} />
                <Route path="projects" element={<ManageProjects />} />
                <Route path="users" element={<ManageUsers />} />
                <Route path="edit-project/:id" element={<EditProject />} />
                <Route path="enquiries" element={<ManageEnquiries />} />
                <Route path="blogs" element={<ManageBlogs />} />
                <Route path="add-blog" element={<AddBlog />} />
                <Route path="edit-blog/:id" element={<EditBlog />} />
                <Route path="careers" element={<ManageCareers />} />
                <Route path="add-job" element={<AddJob />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
      {!isAuthPage && <Footer />}
    </div>
  );
}

export default App;
