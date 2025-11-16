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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Document Analyzer</h1>
            <p className="text-gray-600">Upload documents and generate summaries, interactive quizzes, flashcards, and enable Q&A</p>
          </div>
          
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