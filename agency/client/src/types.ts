export interface Project {
  _id?: string;
  id?: string; // Static ID for URL routing
  title: string;
  description: string;
  fullDescription?: string;
  challenge?: string;
  solution?: string;
  technologies?: string[];
  impact?: string;
  gallery?: string[];
  image: string;
  categories: string[];
  link?: string;
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
  createdAt?: string;
}

export interface Enquiry {
  _id?: string;
  name: string;
  email: string;
  service: string;
  message: string;
  createdAt?: string;
}
export interface BlogPost {
  _id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  image: string;
  content?: string;
}

export interface JobOpening {
  _id: string;
  role: string;
  type: string;
  location: string;
  description: string;
  requirements?: string[];
}
