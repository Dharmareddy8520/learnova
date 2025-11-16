import React from 'react';
import FileUploadSummary from '../components/FileUploadSummary';

const FileSummarizerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-14 md:pt-0 md:pb-0 md:pl-64">
      <div className="container mx-auto px-4 py-8">
        <FileUploadSummary />
      </div>
    </div>
  );
};

export default FileSummarizerPage;