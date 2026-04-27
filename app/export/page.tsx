'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ExportPage() {
    const { user, loading } = useAuth();
    const [exporting, setExporting] = useState(false);
    const [messages, setMessages] = useState<string[]>([]);

    const handleExport = async () => {
        if (!user) {
            setMessages((prev) => [...prev, 'You need to be logged in to export your meals.']);
            return;
        }

        try {
            setExporting(true);
            setMessages(['Starting export process...']);

            if (!db) {
                throw new Error('Firestore DB is not initialized.');
            }

            setMessages((prev) => [...prev, `Fetching meals for user ID: ${user.uid}`]);

            const mealsRef = collection(db as any, 'users', user.uid, 'meals');
            const q = query(mealsRef, orderBy('createdAt', 'desc'));

            const snapshot = await getDocs(q);

            setMessages((prev) => [...prev, `Found ${snapshot.docs.length} meals.`]);

            const meals = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Create blob and download link
            const blob = new Blob([JSON.stringify(meals, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `nutrix_meals_export_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setMessages((prev) => [...prev, 'Export complete! File downloaded.']);
        } catch (error) {
            console.error('Export error:', error);
            setMessages((prev) => [...prev, `Error: ${error instanceof Error ? error.message : String(error)}`]);
            // If we need missing index, Firebase will provide a URL in the error message for easy index creation.
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading authentication state...</div>;
    }

    return (
        <div className="p-8 max-w-xl mx-auto dark:text-white">
            <h1 className="text-2xl font-bold mb-4">Export Your Meals</h1>
            <p className="mb-6 opacity-80">
                Export all your meals exactly as stored in the database. The extracted JSON file will contain all detailed information including nutrients, recipe IDs, exactly as requested, sorted newest to oldest.
            </p>

            <button
                onClick={handleExport}
                disabled={exporting || !user}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
            >
                {exporting ? 'Exporting...' : 'Export to JSON'}
            </button>

            {!user && (
                <p className="mt-4 text-red-500">
                    You are currently not signed in. Please navigate to the home page or login screen to authenticate.
                </p>
            )}

            {messages.length > 0 && (
                <div className="mt-8 bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm font-mono overflow-auto">
                    {messages.map((m, i) => (
                        <div key={i}>{m}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
