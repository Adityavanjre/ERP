import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import api from '../../api';
import ImageUploader from '../../components/Admin/ImageUploader';

const EditProject = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [fullDescription, setFullDescription] = useState('');
    const [category, setCategory] = useState('Web');
    const [image, setImage] = useState('');
    const [link, setLink] = useState('');

    // Detailed fields
    const [challenge, setChallenge] = useState('');
    const [solution, setSolution] = useState('');
    const [technologies, setTechnologies] = useState('');
    const [impact, setImpact] = useState('');
    const [quote, setQuote] = useState('');
    const [author, setAuthor] = useState('');
    const [role, setRole] = useState('');
    const [gallery, setGallery] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const { data } = await api.get(`/projects/${id}`);
                setTitle(data.title);
                setDescription(data.description);
                setFullDescription(data.fullDescription || '');
                setCategory(data.categories?.[0] || 'Web');
                setImage(data.image);
                setLink(data.link || '');
                setChallenge(data.challenge || '');
                setSolution(data.solution || '');
                setTechnologies(data.technologies?.join(', ') || '');
                setImpact(data.impact || '');
                setQuote(data.testimonial?.quote || '');
                setAuthor(data.testimonial?.author || '');
                setRole(data.testimonial?.role || '');
                setGallery(data.gallery?.join(', ') || '');
            } catch (err) {
                setError('Failed to fetch project details');
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            await api.put(`/projects/${id}`, {
                title,
                description,
                fullDescription,
                categories: [category],
                image,
                link,
                challenge,
                solution,
                technologies: technologies.split(',').map(t => t.trim()).filter(t => t !== ''),
                impact,
                testimonial: { quote, author, role },
                gallery: gallery.split(',').map(g => g.trim()).filter(g => g !== '')
            });

            navigate('/admin/projects');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <span className="w-2 h-8 bg-indigo-500 rounded-full inline-block"></span>
                            Edit Project
                        </h2>
                        <button
                            onClick={() => navigate('/admin/projects')}
                            className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors"
                        >
                            <ArrowLeft size={16} /> Cancel
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Project Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                    required
                                />
                            </div>

                            <ImageUploader
                                label="Hero Image (Hero Preview)"
                                onUploadSuccess={(url) => setImage(url)}
                                existingImage={image}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Short Excerpt (for cards)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Full Case Study Overview</label>
                            <textarea
                                value={fullDescription}
                                onChange={(e) => setFullDescription(e.target.value)}
                                rows={4}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">The Challenge</label>
                                <textarea
                                    value={challenge}
                                    onChange={(e) => setChallenge(e.target.value)}
                                    rows={3}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Our Solution</label>
                                <textarea
                                    value={solution}
                                    onChange={(e) => setSolution(e.target.value)}
                                    rows={3}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Technologies (comma separated)</label>
                                <input
                                    type="text"
                                    value={technologies}
                                    onChange={(e) => setTechnologies(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="React, AWS, Node.js"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Key Impact / Results</label>
                                <input
                                    type="text"
                                    value={impact}
                                    onChange={(e) => setImpact(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="40% increase in revenue"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <h3 className="text-gray-400 font-bold uppercase tracking-wider text-xs">Client Testimonial</h3>
                            <textarea
                                value={quote}
                                onChange={(e) => setQuote(e.target.value)}
                                placeholder="The quote..."
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 text-sm italic"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    placeholder="Author Name"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                                />
                                <input
                                    type="text"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    placeholder="Job Role / Title"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="Web">Web Development</option>
                                    <option value="App">App Development</option>
                                    <option value="Design">Design</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Cloud">Cloud</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Gallery URLs (comma separated)</label>
                                <input
                                    type="text"
                                    value={gallery}
                                    onChange={(e) => setGallery(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="url1, url2, url3"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Live Link</label>
                            <input
                                type="url"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                                placeholder="https://"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-lg flex items-center justify-center font-bold mt-8 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Updating...' : (
                                <>
                                    <Save size={20} className="mr-2" />
                                    Update Project
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default EditProject;
