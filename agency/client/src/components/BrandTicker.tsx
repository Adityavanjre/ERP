import Marquee from 'react-fast-marquee';

const BrandTicker = () => {
    // Using text placeholders for logos to ensure professional look without broken images
    // In a real scenario, these would be SVG logos
    const brands = [
        "Lumina Fashion", "Nexus Health", "EstatePrime", "FinVault",
        "Culina", "EcoTrack", "Zenith Apparel", "TechSummit", "Urban Romance"
    ];

    return (
        <section className="py-12 bg-black border-y border-white/5 overflow-hidden">
            <div className="container mx-auto px-4 mb-8 text-center">
                <p className="text-gray-500 text-sm uppercase tracking-widest font-medium">Trusted by Industry Leaders</p>
            </div>

            <Marquee gradient={true} gradientColor="black" speed={40}>
                {brands.map((brand, index) => (
                    <div key={index} className="mx-12 opacity-50 hover:opacity-100 transition-opacity cursor-default">
                        <span className="text-2xl md:text-3xl font-bold text-gray-300 font-serif">{brand}</span>
                    </div>
                ))}
            </Marquee>
        </section>
    );
};

export default BrandTicker;
