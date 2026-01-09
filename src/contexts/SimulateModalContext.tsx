    "use client";
    import { createContext, useContext, useState } from "react";
    import SimulateContent from '@/components/SimulateContent';


    type ContextType = {
        open: () => void;
        close: () => void;
    };

    const SimulateModalContext = createContext<ContextType | null>(null);

    export function SimulateModalProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const open = () => {
        setIsOpen(true);
        requestAnimationFrame(() => setIsVisible(true));
    };

    const close = () => {
        setIsVisible(false);
        setTimeout(() => setIsOpen(false), 300);
    };

    return (
        <SimulateModalContext.Provider value={{ open, close }}>
        {children}

        {isOpen && (
            <div
            className={`modalCnt ${isVisible ? "show" : "hide"}`}
            onClick={close}
            >
            <div onClick={(e) => e.stopPropagation()}>
                <SimulateContent onClose={() => setIsOpen(false)} />
            </div>
            </div>
        )}
        </SimulateModalContext.Provider>
    );
    }

    export const useSimulateModal = () => {
        const ctx = useContext(SimulateModalContext);
        if (!ctx) throw new Error("useSimulateModal must be used inside Provider");
        return ctx;
    };
