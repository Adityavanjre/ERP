/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#C5A059", // Champagne Gold
                secondary: "#7C3AED", // Royal Violet
                bg: "#0A0A0B",
                surface: "#121214",
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
                heading: ['Outfit', 'sans-serif'],
                display: ['Playfair Display', 'serif'],
            },
            animation: {
                'infinite-scroll': 'infinite-scroll 25s linear infinite',
            },
            keyframes: {
                'infinite-scroll': {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(-50%)' },
                }
            }
        },
    },
    plugins: [],
}
