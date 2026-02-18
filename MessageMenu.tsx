import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface MessageMenuProps {
    messageId: string;
    isSender: boolean;
    onEdit: () => void;
    onDelete: (deleteForEveryone: boolean) => void;
}

export const MessageMenu: React.FC<MessageMenuProps> = ({
    messageId,
    isSender,
    onEdit,
    onDelete
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    if (!isSender) return null;

    const handleEdit = () => {
        setIsOpen(false);
        onEdit();
    };

    const handleDeleteClick = () => {
        setIsOpen(false);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = (deleteForEveryone: boolean) => {
        setShowDeleteModal(false);
        onDelete(deleteForEveryone);
    };

    return (
        <>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1 hover:bg-black/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="Message options"
                >
                    <MoreVertical size={16} />
                </button>

                {isOpen && (
                    <div className="absolute right-0 top-8 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50 min-w-[180px] animate-slide-up">
                        <button
                            onClick={handleEdit}
                            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-zinc-700 transition-colors flex items-center space-x-3"
                        >
                            <Edit2 size={16} className="text-lime-400" />
                            <span>Edit Message</span>
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            className="w-full px-4 py-3 text-left text-sm text-white hover:bg-zinc-700 transition-colors flex items-center space-x-3 border-t border-zinc-700"
                        >
                            <Trash2 size={16} className="text-red-400" />
                            <span>Delete Message</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-zinc-900 rounded-3xl p-6 max-w-sm w-full mx-4 border border-zinc-800 shadow-2xl animate-slide-up">
                        <h3 className="text-xl font-bold text-white mb-2">Delete Message</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            Choose how you want to delete this message:
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleDeleteConfirm(false)}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-xl transition-all text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold">Delete for me</div>
                                        <div className="text-xs text-zinc-400">Only you won't see this message</div>
                                    </div>
                                    <Trash2 size={18} className="text-zinc-400" />
                                </div>
                            </button>

                            <button
                                onClick={() => handleDeleteConfirm(true)}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 px-4 rounded-xl transition-all border border-red-500/20 text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold">Delete for everyone</div>
                                        <div className="text-xs text-red-400/70">This message will be removed for both sides</div>
                                    </div>
                                    <Trash2 size={18} className="text-red-400" />
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
