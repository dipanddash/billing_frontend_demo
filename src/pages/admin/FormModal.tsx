import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const FormModal = ({ open, title, onClose, children }: Props) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-border p-6 relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button onClick={onClose}>
                  <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>

              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FormModal;   
