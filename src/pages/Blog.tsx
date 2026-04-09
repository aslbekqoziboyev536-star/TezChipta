import { useSettings } from '../context/SettingsContext';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Tag, Calendar, User as UserIcon, ArrowRight, X, Image as ImageIcon, Newspaper, Bus, Filter } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { SafeImage } from '../components/SafeImage';
import { Button } from '../components/ui/Button';
import { Volume2, VolumeX, BellOff } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  image?: string;
  createdAt: string;
  tags?: string[];
}

export default function Blog() {
  const { logoUrl } = useSettings();
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const { t } = useLanguage();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image: '',
    tags: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'blogs');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormLoading(true);

    try {
      const postData = {
        title: formData.title,
        content: formData.content,
        image: formData.image,
        authorId: user.id,
        authorName: user.name,
        createdAt: editingPost ? editingPost.createdAt : new Date().toISOString(),
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== '')
      };

      if (editingPost) {
        await updateDoc(doc(db, 'blogs', editingPost.id), postData);
      } else {
        await addDoc(collection(db, 'blogs'), postData);
      }

      setIsModalOpen(false);
      setEditingPost(null);
      setFormData({ title: '', content: '', image: '', tags: '' });
    } catch (error) {
      handleFirestoreError(error, editingPost ? OperationType.UPDATE : OperationType.CREATE, 'blogs');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'blogs', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'blogs');
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || (post.tags && post.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || []))).sort();

  const canWrite = user && (user.role === 'admin' || user.role === 'driver');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] transition-colors duration-300">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2 text-emerald-500">
              <SafeImage src={logoUrl} alt="Tez Chipta" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Tez<span className="text-emerald-500">Chipta</span></span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {canWrite && (
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 h-auto"
                leftIcon={<Plus className="w-5 h-5" />}
              >
                <span className="hidden sm:inline">{t('blog.add_post')}</span>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,_rgba(16,185,129,0.3)_0%,_transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,_rgba(16,185,129,0.2)_0%,_transparent_50%)]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6"
          >
            TezChipta <span className="text-emerald-500">Blogi</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            {t('blog.subtitle')}
          </motion.p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('blog.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant={!selectedTag ? 'primary' : 'secondary'}
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all h-auto border-0 ${!selectedTag ? '' : 'bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:border-emerald-500'}`}
            >
              {t('blog.all_tags')}
            </Button>
            {allTags.map(tag => (
              <Button
                key={tag}
                variant={selectedTag === tag ? 'primary' : 'secondary'}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all h-auto border-0 ${selectedTag === tag ? '' : 'bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:border-emerald-500'}`}
              >
                #{tag}
              </Button>
            ))}
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white dark:bg-[#111827] rounded-3xl h-[450px]" />
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white dark:bg-[#111827] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={post.image || `https://picsum.photos/seed/${post.id}/800/500`}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    {post.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/30 uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
                      {post.authorName}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-500 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-6 flex-1">
                    {post.content}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-white/5">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedPost(post)}
                      className="flex items-center gap-2 text-emerald-500 font-bold text-sm group/btn p-0 h-auto hover:bg-transparent"
                      rightIcon={<ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
                    >
                      {t('blog.read_more')}
                    </Button>

                    {user && (user.role === 'admin' || user.id === post.authorId) && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPost(post);
                            setFormData({
                              title: post.title,
                              content: post.content,
                              image: post.image || '',
                              tags: post.tags?.join(', ') || ''
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-emerald-500 transition-colors h-auto border-0"
                          leftIcon={<Filter className="w-4 h-4" />}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(post.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors h-auto border-0"
                          leftIcon={<X className="w-4 h-4" />}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Newspaper className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('blog.empty_title')}</h3>
            <p className="text-gray-500 dark:text-gray-400">{t('blog.empty_desc')}</p>
          </div>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingPost ? t('blog.modal.edit_title') : t('blog.modal.add_title')}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors h-auto border-0"
                  leftIcon={<X className="w-6 h-6 text-gray-500" />}
                />
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Sarlavha</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Post sarlavhasini kiriting"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Rasm URL (ixtiyoriy)</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Teglar (vergul bilan ajrating)</label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="sayohat, yangilik, maslahat"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Mazmuni</label>
                  <textarea
                    required
                    rows={6}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    placeholder={t('blog.modal.content_placeholder')}
                  />
                </div>

                <Button
                  type="submit"
                  loading={formLoading}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-4 h-auto"
                >
                  {editingPost ? t('admin.common.save') : t('blog.publish')}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-[#111827] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="relative aspect-video flex-shrink-0">
                <img
                  src={selectedPost.image || `https://picsum.photos/seed/${selectedPost.id}/1200/800`}
                  alt={selectedPost.title}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedPost(null)}
                  className="absolute top-4 right-4 bg-black/20 backdrop-blur-md text-white hover:bg-black/40 rounded-full h-10 w-10 border-0 p-0"
                  leftIcon={<X className="w-6 h-6" />}
                />
              </div>

              <div className="p-8 overflow-y-auto">
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-lg">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-lg">
                    <UserIcon className="w-4 h-4 text-emerald-500" />
                    {selectedPost.authorName}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.tags?.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg uppercase tracking-wider">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                  {selectedPost.title}
                </h2>

                <div className="prose prose-emerald dark:prose-invert max-w-none">
                  <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {selectedPost.content}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex justify-end">
                <Button
                  onClick={() => setSelectedPost(null)}
                  className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl h-auto"
                >
                  {t('blog.modal.close')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
