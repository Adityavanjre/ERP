import type { Project } from '../types';

export const projects: Project[] = [
    {
        id: 'lumina-fashion',
        title: 'Lumina Fashion',
        categories: ['Web', 'Design', 'E-Commerce'],
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1170&auto=format&fit=crop',
        description: 'A bespoke e-commerce experience for a luxury fashion house.',
        fullDescription: 'Lumina Fashion represents the pinnacle of digital luxury retail. We were approached to completely overhaul their outdated online presence and create a storefront that matched the elegance of their physical boutiques. The goal was to reduce friction, increase average order value, and tell the brand story effectively.',
        challenge: 'The client faced high cart abandonment rates due to a clunky checkout process and slow page loads. Additionally, the mobile experience was non-responsive, alienating a significant portion of their traffic.',
        solution: 'We built a headless commerce solution using Next.js and Shopify Plus. This allowed for lightning-fast page loads and complete design freedom. we implemented AI-driven product recommendations and a streamlined one-page checkout.',
        technologies: ['React', 'Next.js', 'Shopify Plus', 'Tailwind CSS', 'Framer Motion'],
        impact: '40% increase in conversion rate, 25% increase in AOV, and a 60% reduction in bounce rate.',
        testimonial: {
            quote: "Klypso transformed our digital presence. The new site captures our brand essence perfectly while delivering incredible performance.",
            author: "Elena Rossi",
            role: "CMO, Lumina Fashion"
        },
        gallery: [
            'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1170&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1490481651871-ab5a8cf0db69?q=80&w=1170&auto=format&fit=crop'
        ]
    },
    {
        id: 'nexus-health',
        title: 'Nexus Health',
        categories: ['App', 'Web', 'Healthcare'],
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1170&auto=format&fit=crop',
        description: 'A HIPAA-compliant telemedicine platform connecting patients with specialists.',
        fullDescription: 'Nexus Health needed a secure, reliable platform to facilitate remote doctor-patient consultations during the pandemic and beyond. Security and ease of use were paramount.',
        challenge: 'Ensuring end-to-end encryption for video calls while maintaining high video quality on low-bandwidth connections. The system also needed to integrate with legacy Electronic Health Record (EHR) systems.',
        solution: 'We utilized WebRTC for secure, high-quality video streaming and built a custom encrypted messaging layer. We developed middleware to safely sync data with existing hospital databases using HL7 standards.',
        technologies: ['React', 'Node.js', 'WebRTC', 'Socket.io', 'MongoDB'],
        impact: 'Facilitated over 50,000 remote consultations in the first year and reduced patient wait times by 70%.',
        testimonial: {
            quote: "A secure, robust platform that stood up to the demands of a global crisis. Klypso delivered under immense pressure.",
            author: "Dr. James Chen",
            role: "CTO, Nexus Health"
        },
        gallery: [
            'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=1170&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=1170&auto=format&fit=crop'
        ]
    },
    {
        id: 'estate-prime',
        title: 'EstatePrime',
        categories: ['Web', 'Cloud', 'Real Estate'],
        image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1073&auto=format&fit=crop',
        description: 'A high-performance real estate portal processing over 100,000 listings daily.',
        fullDescription: 'EstatePrime aimed to disrupt the real estate market with a platform that offered virtual tours and instant valuation estimates.',
        challenge: 'Handling a massive database of property images and providing real-time search filtering without latency.',
        solution: 'We implemented Elasticsearch for sub-millisecond search queries and used an image CDN for optimized media delivery. We also integrated Matterport APIs for 3D virtual tours.',
        technologies: ['Vue.js', 'Elasticsearch', 'AWS S3', 'Python/Django'],
        impact: 'Processes 100k+ listings daily with sub-second search speeds. User engagement time increased by 300%.',
        gallery: [
            'https://images.unsplash.com/photo-1582407947304-fd86f028f808?q=80&w=1000&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1170&auto=format&fit=crop'
        ]
    },
    {
        id: 'finvault',
        title: 'FinVault',
        categories: ['Web', 'Cloud', 'FinTech'],
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1170&auto=format&fit=crop',
        description: 'A secure, bank-grade financial dashboard for high-net-worth individuals.',
        fullDescription: 'FinVault required a fortress-like application for users to manage diverse investment portfolios. Trust and data visualization were key components.',
        challenge: 'Aggregating real-time data from multiple stock exchanges and crypto markets while ensuring zero-trust security architecture.',
        solution: 'We built a microservices architecture with a dedicated security layer. We used D3.js for complex, interactive financial charting and deployed the app in a private cloud environment.',
        technologies: ['Angular', 'D3.js', 'Java Spring Boot', 'PostgreSQL'],
        impact: 'Trusted by over 500 private wealth managers. Zero security breaches since launch.',
        gallery: [
            'https://images.unsplash.com/photo-1611974765270-ca12586343bb?q=80&w=1170&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1170&auto=format&fit=crop'
        ]
    },
    {
        id: 'culina-app',
        title: 'Culina',
        categories: ['App', 'Design', 'Hospitality'],
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1170&auto=format&fit=crop',
        description: 'A vibrant, interactive app for a global restaurant chain.',
        fullDescription: 'Culina wanted to digitize the dining experience without losing the personal touch. They needed an app for reservations, ordering, and loyalty rewards.',
        challenge: 'Syncing real-time table availability across 200+ locations and integrating with various Point of Sale (POS) systems.',
        solution: 'We developed a cross-platform mobile app using React Native. We created a unified API layer that bridged the gap between the app and the disparate POS systems at different locations.',
        technologies: ['React Native', 'Firebase', 'GraphQL', 'Node.js'],
        impact: '2 million downloads in the first 6 months. Loyalty program participation grew by 150%.',
        gallery: [
            'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1074&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=1170&auto=format&fit=crop'
        ]
    },
    {
        id: 'ecotrack-iot',
        title: 'EcoTrack',
        categories: ['Web', 'Cloud', 'IoT'],
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1169&auto=format&fit=crop',
        description: 'An IoT-enabled dashboard for monitoring industrial energy consumption.',
        fullDescription: 'EcoTrack helps large manufacturing plants monitor their energy usage in real-time to identify wastage and optimize efficiency.',
        challenge: 'Visualizing massive streams of sensor data in real-time without overwhelming the user interface.',
        solution: 'We implemented a time-series database (InfluxDB) and used WebSockets for live data updates. The UI features customizable dashboards allowing engineers to focus on specific metrics.',
        technologies: ['React', 'Redux', 'InfluxDB', 'Go', 'MQTT'],
        impact: 'Clients reported an average of 15% reduction in energy costs within the first quarter of adoption.',
        gallery: [
            'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1170&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1170&auto=format&fit=crop'
        ]
    },
    {
        id: 'zenith-apparel-shoot',
        title: 'Zenith Apparel',
        categories: ['Photography', 'Design'],
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1020&auto=format&fit=crop',
        description: 'High-fashion editorial photoshoot for a new sustainable clothing line.',
        fullDescription: 'Zenith Apparel needed a visual language that spoke to their core values of sustainability and modern elegance. We conducted a full-day editorial shoot in natural light to highlight the organic textures of their fabrics.',
        challenge: 'Capturing the texture and drape of the clothing while maintaining a consistent "golden hour" lighting aesthetic throughout the day.',
        solution: 'We used a combination of natural light control and subtle reflectors. The post-processing focused on color grading that enhanced the earth tones of the collection.',
        technologies: ['Sony A7R IV', 'Profound Lighting', 'Adobe Lightroom', 'Capture One'],
        impact: 'The campaign images led to a 300% increase in social media engagement for the brand launch.',
        gallery: [
            'https://images.unsplash.com/photo-1529139574466-a302d27f3d9f?q=80&w=1170&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1503342394128-c104d54dba01?q=80&w=1170&auto=format&fit=crop'
        ]
    },
    {
        id: 'eternal-vows-wedding',
        title: 'Eternal Vows',
        categories: ['Photography', 'Event'],
        image: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1170&auto=format&fit=crop',
        description: 'Cinematic wedding photography capturing the raw emotion and beauty of your special day.',
        fullDescription: 'We believe every wedding tells a unique love story. Our team of photographers specializes in candid, documentary-style wedding photography that captures the fleeting moments you\'ll cherish forever. From the intimate preparations to the grand celebration, we are there to document it all.',
        challenge: 'Capturing low-light reception moments without intrusive flash, while coordinating with videographers to not miss key events.',
        solution: 'We used prime lenses with wide apertures to capture ambient light naturally. Our team coordinated seamlessly with the video crew using silent hand signals to ensure full coverage without obstruction.',
        technologies: ['Sony A7R IV', 'Godox Lighting', 'Prime Lenses', 'Drone Photography'],
        impact: 'Delivered a gallery of 800+ edited images within 2 weeks. Featured in \'Bridal Magazine 2024\'.',
        gallery: [
            'https://images.unsplash.com/photo-1511285560982-1351cdeb9821?q=80&w=1170&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1623943361546-3485038b3408?q=80&w=1000&auto=format&fit=crop'
        ]
    },
    {
        id: 'techsummit-2025',
        title: 'TechSummit 2025',
        categories: ['Photography', 'Event'],
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1170&auto=format&fit=crop',
        description: 'Comprehensive coverage for Asia\'s largest technology conference.',
        fullDescription: 'TechSummit required a photography team that could move fast and deliver images in real-time for social media updates. We covered keynotes, breakout sessions, and networking events for over 5000 attendees.',
        challenge: 'The venue had mixed lighting conditions (stage lights vs. exhibition halls) and a need for instant delivery of keynote speaker photos.',
        solution: 'We set up a dedicated editing station on-site. Photographers utilized wireless tethering to send images directly to the editor for immediate processing and upload.',
        technologies: ['Canon R5', 'Wireless Tethering', 'Lightroom Mobile', 'Live Series'],
        impact: 'Real-time social media posts generated 500k impressions during the 2-day event.',
        gallery: [
            'https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1170&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1112&auto=format&fit=crop'
        ]
    },
    {
        id: 'urban-romance',
        title: 'Urban Romance',
        categories: ['Photography', 'Design'],
        image: 'https://images.unsplash.com/photo-1550275994-fa4782352848?q=80&w=1170&auto=format&fit=crop',
        description: 'A stylized pre-wedding shoot set against the city skyline.',
        fullDescription: 'The couple wanted a modern, edgy vibe for their Save-the-Date cards. We scouted architectural landmarks and rooftop bars to create a chic, editorial-style photo series that broke away from traditional clichés.',
        challenge: 'Managing crowds at popular public locations and timing the golden hour perfectly across multiple shoot spots.',
        solution: 'We planned a precise itinerary and secured rooftop permissions in advance. We used off-camera flash to balance the couple against the bright city lights.',
        technologies: ['Nikon Z9', 'Off-Camera Flash', 'Urban Scouting', 'Styling Assistant'],
        impact: 'The \'Save the Date\' video reel created from the stills went viral on Instagram Reels.',
        gallery: [
            'https://images.unsplash.com/photo-1516054712128-472d25088921?q=80&w=1152&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1494774157365-9e04c6720e47?q=80&w=1170&auto=format&fit=crop'
        ]
    },
    {
        id: 'new-beginnings',
        title: 'New Beginnings',
        categories: ['Photography', 'Event'],
        image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?q=80&w=1170&auto=format&fit=crop',
        description: 'Celebrating the joy of motherhood with a tender baby shower session.',
        fullDescription: 'We captured the anticipation and joy of expecting parents in a serene outdoor setting. The focus was on natural light, soft textures, and genuine emotions of family and friends.',
        challenge: 'The weather was unpredictable, with intermittent rain showers threatening the outdoor session.',
        solution: 'We used the overcast sky to our advantage as a giant softbox, creating soft, flattering light. We also had a backup studio location ready just in case.',
        technologies: ['Fujifilm GFX 100', 'Natural Light', 'Soft Focus Lenses'],
        impact: 'The family ordered a large-format canvas print layout for their nursery.',
        gallery: [
            'https://images.unsplash.com/photo-1565507722961-0b5c14102c79?q=80&w=1036&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1456314810688-661d9ac5f7c3?q=80&w=1170&auto=format&fit=crop'
        ]
    }
];
