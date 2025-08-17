import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
        </div>
        
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Page not found
          </h2>
          <p className="text-gray-600 max-w-md">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="primary"
            onClick={() => window.history.back()}
            className="inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
          
          <Link to="/">
            <Button variant="outline" className="inline-flex items-center">
              <Home className="h-4 w-4 mr-2" />
              Go home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;