import React from 'react';
import FileUploadSummary from '../components/FileUploadSummary';
import AppSidebar from '../components/AppSidebar';

// Main DocumentAnalyzerPage Component
const DocumentAnalyzerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <AppSidebar />
      
      <main className="pt-14 pb-14 md:pt-0 md:pb-0 md:ml-64">
        <div className="container mx-auto px-4 py-8">
          {/* File Upload Component */}
          <div className="mb-8">
            <FileUploadSummary />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentAnalyzerPage;