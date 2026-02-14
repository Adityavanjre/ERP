import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import API_URL from '../../api/config';

const AddJob = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [role, setRole] = useState('');
    const [type, setType] = useState('Full-time');
    const [location, setLocation] = useState('Remote');
    const [description, setDescription] = useState('');
    const [requirements, setRequirements] = useState<string[]>([]);
    const [newRequirement, setNewRequirement] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddRequirement = () => {
        if (newRequirement.trim()) {
            setRequirements([...requirements, newRequirement.trim()]);
            setNewRequirement('');
        }
    };

    const removeRequirement = (index: number) => {
        setRequirements(requirements.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user?.token}`,
                },
            };

            await axios.post(`${API_URL}/api/jobs`, {
                role,
                type,
                location,
                description,
                requirements
            }, config);

            navigate('/admin/careers');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to post job');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <span className="w-2 h-8 bg-pink-500 rounded-full inline-block"></span>
                            Post New Job Vacancy
                        </h2>
                        <button
                            onClick={() => navigate('/admin/careers')}
                            className="text-gray-400 hover:text-white flex items-center gap-2 text-sm transition-colors"
                        >
                            <ArrowLeft size={16} /> Cancel
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-400 pl-1">Job Role / Title</label>
                                <input
                                    type="text"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500 transition-all text-lg font-bold"
                                    placeholder="e.g. Senior Product Designer"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400 pl-1">Job Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500 transition-all appearance-none"
                                >
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 pl-1">Work Location</label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500 transition-all"
                                placeholder="e.g. Chennai, India / Remote"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400 pl-1">Job Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={5}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-pink-500 transition-all text-sm leading-relaxed"
                                placeholder="Describe the role and primary responsibilities..."
                                required
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-medium text-gray-400 pl-1">Key Requirements</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newRequirement}
                                    onChange={(e) => setNewRequirement(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRequirement())}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-pink-500 transition-all text-sm"
                                    placeholder="Add a requirement (e.g. 5+ years React experience)"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddRequirement}
                                    className="bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-xl transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {requirements.map((req, idx) => (
                                    <div key={idx} className="bg-pink-500/10 border border-pink-500/20 text-pink-300 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 group">
                                        {req}
                                        <button type="button" onClick={() => removeRequirement(idx)} className="text-pink-500/50 hover:text-pink-400 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-8">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-pink-600 hover:bg-pink-500 py-4 rounded-xl flex items-center justify-center font-bold text-white transition-all shadow-xl shadow-pink-600/10 active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                                ) : <Briefcase size={20} className="mr-2" />}
                                {loading ? 'Posting...' : 'Launch Vacancy'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default AddJob;
