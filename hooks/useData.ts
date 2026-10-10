
import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, doc, onSnapshot, setDoc, addDoc, query, orderBy, FirestoreError } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Run, UserGoals, BeerLog } from '../types';

const DEFAULT_GOALS: UserGoals = {
    weeklyMi: 15,
    monthlyMi: 60,
    weightLbs: 160
};

export function useData() {
    const { currentUser } = useAuth();
    const [runs, setRuns] = useState<Run[]>([]);
    const [beerLogs, setBeerLogs] = useState<BeerLog[]>([]);
    const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        if (!currentUser) {
            setRuns([]);
            setBeerLogs([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const handleError = (err: FirestoreError) => {
            console.error('Firestore listener error:', err);
            setError(err.code || 'unknown');
            setLoading(false);
        };

        // Sub to Runs
        const runsRef = collection(db, 'users', currentUser.uid, 'runs');
        const qRuns = query(runsRef, orderBy('date', 'desc'));
        const unsubRuns = onSnapshot(qRuns, (snapshot) => {
            const fetchedRuns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Run));
            setRuns(fetchedRuns);
        }, handleError);

        // Sub to Beer Logs
        const beerRef = collection(db, 'users', currentUser.uid, 'beerLogs');
        const qBeer = query(beerRef, orderBy('date', 'desc'));
        const unsubBeer = onSnapshot(qBeer, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BeerLog));
            setBeerLogs(fetchedLogs);
        }, handleError);

        // Sub to Goals
        const goalsRef = doc(db, 'users', currentUser.uid, 'settings', 'goals');
        const unsubGoals = onSnapshot(goalsRef, (docSnap) => {
            if (docSnap.exists()) {
                setGoals(docSnap.data() as UserGoals);
            } else {
                // Initialize default goals if not exist
                setDoc(goalsRef, DEFAULT_GOALS).catch(handleError);
            }
            setLoading(false);
        }, handleError);

        return () => {
            unsubRuns();
            unsubBeer();
            unsubGoals();
        };
    }, [currentUser, retryKey]);

    const retry = () => setRetryKey(k => k + 1);

    const saveRun = async (run: Run) => {
        if (!currentUser) return;
        // Use setDoc with the ID from the run object to ensure idempotency if needed, or addDoc for auto-ID
        // Since we generate ID in Tracker, we use setDoc
        const runRef = doc(db, 'users', currentUser.uid, 'runs', run.id);
        await setDoc(runRef, run);
    };

    const logBeer = async (beer: Omit<BeerLog, 'id'>) => {
        if (!currentUser) return;
        const beerRef = collection(db, 'users', currentUser.uid, 'beerLogs');
        // Let Firestore generate the ID
        await addDoc(beerRef, beer);
    };

    const updateGoals = async (newGoals: UserGoals) => {
        if (!currentUser) return;
        const goalsRef = doc(db, 'users', currentUser.uid, 'settings', 'goals');
        await setDoc(goalsRef, newGoals, { merge: true });
    };

    return {
        runs,
        beerLogs,
        goals,
        loading,
        error,
        retry,
        saveRun,
        logBeer,
        updateGoals
    };
}
