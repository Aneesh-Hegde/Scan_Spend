import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface Income {
    id: number;
    source: string;
    amountDescription: string;
    amount: number;
    date: string;
}

interface EditIncomeModalProps {
    show: boolean;
    onClose: () => void;
    income: Income | null; // The income to be edited
    onSaveIncome: (income: Income) => Promise<void>;
}

const EditIncomeModal: React.FC<EditIncomeModalProps> = ({ show, onClose, income, onSaveIncome }) => {
    const [editingIncomeData, setEditingIncomeData] = useState<Income | null>(null);

    useEffect(() => {
        if (show && income) {
            setEditingIncomeData({ ...income });
        } else if (!show) {
            setEditingIncomeData(null); // Clear data when modal closes
        }
    }, [show, income]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (!editingIncomeData) return;

        setEditingIncomeData(prev => {
            if (!prev) return null;
            if (name === 'amount') {
                return { ...prev, [name]: parseFloat(value) || 0 };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleSubmit = async () => {
        if (editingIncomeData) {
            // Add validation here if needed
            if (!editingIncomeData.source || !editingIncomeData.amountDescription || isNaN(editingIncomeData.amount)) {
                alert("Please fill all required fields correctly.");
                return;
            }
            await onSaveIncome(editingIncomeData);
        }
    };

    if (!show || !editingIncomeData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl overflow-hidden">
                <div className="flex justify-between items-center border-b p-6 bg-gradient-to-r from-green-50 to-green-100">
                    <h3 className="text-2xl font-bold text-gray-900">Edit Income Source</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/50 transition-colors duration-200">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    <div className="space-y-6">
                        {/* Input fields for source, description, amount, date */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Income Source</label>
                            <input
                                type="text"
                                name="source"
                                value={editingIncomeData.source}
                                onChange={handleInputChange}
                                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                placeholder="e.g., Salary, Freelance, Investment"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <input
                                type="text"
                                name="amountDescription"
                                value={editingIncomeData.amountDescription}
                                onChange={handleInputChange}
                                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                placeholder="Brief description of this income"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                name="amount"
                                value={editingIncomeData.amount}
                                onChange={handleInputChange}
                                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                            <input
                                type="date"
                                name="date"
                                value={editingIncomeData.date}
                                onChange={handleInputChange}
                                className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end items-center gap-4 border-t p-6 bg-gray-50">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors duration-200">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-3 flex items-center rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200">
                        <Save size={16} className="mr-2" /> Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditIncomeModal;
