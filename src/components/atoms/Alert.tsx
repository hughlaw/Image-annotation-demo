import { type ReactNode } from 'react';
import { PiInfo, PiWarning, PiXCircle, PiCheckCircle } from 'react-icons/pi';

type AlertVariant = 'info' | 'warning' | 'error' | 'success';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
}

const variantStyles: Record<AlertVariant, { container: string; icon: string; iconComponent: ReactNode }> = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'text-blue-500',
    iconComponent: <PiInfo className="h-5 w-5" />,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: 'text-yellow-500',
    iconComponent: <PiWarning className="h-5 w-5" />,
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-500',
    iconComponent: <PiXCircle className="h-5 w-5" />,
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: 'text-green-500',
    iconComponent: <PiCheckCircle className="h-5 w-5" />,
  },
};

export default function Alert({ variant = 'info', title, children }: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`rounded-md border p-4 ${styles.container}`}>
      <div className="flex gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>{styles.iconComponent}</div>
        <div className="flex-1">
          {title && <h3 className="mb-1 font-medium">{title}</h3>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
