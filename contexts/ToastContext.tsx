import { Toast, ToastType } from "@/components/ui/Toast";
import React, { createContext, useCallback, useContext, useState } from "react";

interface ToastContextData {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");

  const showToast = useCallback((msg: string, t: ToastType = "info") => {
    setMessage(msg);
    setType(t);
    setVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        message={message}
        type={type}
        visible={visible}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
