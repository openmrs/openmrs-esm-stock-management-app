import React from 'react';
import { Button, InlineNotification, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { getCoreTranslation } from '@openmrs/esm-framework';

type PrintPreviewErrorBoundaryProps = {
  children: React.ReactNode;
  onClose?: () => void;
  title: string;
};

type PrintPreviewErrorBoundaryState = {
  hasError: boolean;
};

const PrintPreviewError: React.FC<Omit<PrintPreviewErrorBoundaryProps, 'children'>> = ({ onClose, title }) => {
  const { t } = useTranslation();

  return (
    <>
      <ModalHeader closeModal={onClose} title={title} />
      <ModalBody>
        <InlineNotification
          hideCloseButton
          kind="error"
          lowContrast
          subtitle={t('printPreviewErrorDescription', 'Unable to load the print preview. Please try again.')}
          title={getCoreTranslation('error')}
        />
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {getCoreTranslation('close')}
        </Button>
      </ModalFooter>
    </>
  );
};

class PrintPreviewErrorBoundary extends React.Component<
  PrintPreviewErrorBoundaryProps,
  PrintPreviewErrorBoundaryState
> {
  state: PrintPreviewErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PrintPreviewErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return <PrintPreviewError onClose={this.props.onClose} title={this.props.title} />;
    }

    return this.props.children;
  }
}

export default PrintPreviewErrorBoundary;
