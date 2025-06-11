import React, { useState } from 'react';
import { Bell, Clipboard, Code, Copy, ExternalLink, Info, Settings, Zap, Activity, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import AttributionModelManager from '../AttributionModelManager';

interface TabProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

const Tab: React.FC<TabProps> = ({ children }) => {
  return <div className="py-4">{children}</div>;
};

const IntegrationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('installation');
  const [copied, setCopied] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'failure'>('idle');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // Mock data
  const mockApiKey = 'tgr_5f3a8c7d9e1b2k3g4h5j6l7z8x9v0';
  const mockClientId = 'client_abc123xyz789';
  
  const mockAttributionModels = [
    {
      id: '1',
      name: 'last_touch',
      settings: {
        lookback_window_days: 30
      },
      is_active: true
    },
    {
      id: '2',
      name: 'time_decay',
      settings: {
        lookback_window_days: 30,
        decay_base: 0.7
      },
      is_active: true
    }
  ];
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSaveModel = (model: any) => {
    console.log('Saving model:', model);
    // Here you would make an API call to save the model
  };

  const handleDeleteModel = (modelId: string) => {
    console.log('Deleting model:', modelId);
    // Here you would make an API call to delete the model
  };
  
  const renderTrackerCode = () => {
    return `<script
  src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-tracker"
  data-client-id="${mockClientId}"
  defer
></script>`;
  };
  
  const renderFullTrackerCode = () => {
    return `// The full tracker source code is now served from our CDN
// View the minified version at:
// ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-tracker

// To track conversions, use:
gTracker.trackConversion('purchase', 99.99, 'USD');

// To set consent status:
gTracker.setConsent(true);`;
  };
  
  const renderApiCode = () => {
    return `// Track a conversion event
fetch('https://api.growertracker.com/events/conversion', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${mockApiKey}'
  },
  body: JSON.stringify({
    visitor_id: 'VISITOR_ID', // Required
    event_type: 'conversion',
    conversion_type: 'purchase', // Or 'lead', 'signup', etc.
    value: 99.99, // Optional - value of the conversion
    currency: 'USD', // Optional
    timestamp: Date.now(),
    page_url: window.location.href
  })
})`;
  };
  
  const renderGTMCode = () => {
    return `// Google Tag Manager - Custom HTML Tag

<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Listen for purchase event
    dataLayer.push({
      'event': 'gtm.dom',
      'gtm.start': new Date().getTime(),
      'gtm.uniqueEventId': 1
    });
    
    // When purchase is completed
    window.dataLayer = window.dataLayer || [];
    dataLayer.push({
      'event': 'purchase',
      'ecommerce': {
        'purchase': {
          'actionField': {
            'id': 'ORDER_ID',
            'revenue': 'TOTAL_VALUE'
          }
        }
      }
    });
    
    // Capture the purchase in AttributionTracker
    if (window.gTracker) {
      window.gTracker.trackConversion('purchase', TOTAL_VALUE, 'USD');
    }
  });
</script>`;
  };

  const verifyTracker = async () => {
    if (!verificationUrl) {
      setVerificationError('Please enter a URL');
      return;
    }

    try {
      setVerificationStatus('loading');
      setVerificationError(null);

      // Add protocol if missing
      let url = verificationUrl;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch page (${response.status})`);
      }

      const html = await response.text();
      const trackerScript = renderTrackerCode();
      
      // Check if the script tag exists in the HTML
      if (html.includes(trackerScript)) {
        setVerificationStatus('success');
      } else {
        setVerificationStatus('failure');
        setVerificationError('Tracker code not found on the page');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setVerificationStatus('failure');
      setVerificationError(error.message || 'Failed to verify tracker');
    }
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Integration</h1>
        <p className="text-gray-500">Set up tracking on your website</p>
      </div>
      
      {/* API Key section */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Your API Key</h2>
            <p className="text-sm text-gray-500 mt-1">Use this key for server-side API calls</p>
          </div>
          
          <button 
            className="text-blue-600 hover:text-blue-800 transition-colors"
            onClick={() => {}}
          >
            Regenerate Key
          </button>
        </div>
        
        <div className="mt-4 flex items-center">
          <div className="flex-1 bg-gray-50 p-3 rounded-l-md border border-gray-200 font-mono text-sm overflow-x-auto">
            {mockApiKey}
          </div>
          <button 
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-3 rounded-r-md border border-l-0 border-gray-200 transition-colors"
            onClick={() => copyToClipboard(mockApiKey)}
          >
            {copied ? <Clipboard size={20} /> : <Copy size={20} />}
          </button>
        </div>
        
        <div className="mt-3 text-xs text-gray-500 flex items-center">
          <Info size={14} className="mr-1" />
          Keep this key secret. Do not expose it in client-side code.
        </div>
      </div>

      {/* Client ID section */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Your Client ID</h2>
            <p className="text-sm text-gray-500 mt-1">Required for the tracking script installation</p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center">
          <div className="flex-1 bg-gray-50 p-3 rounded-l-md border border-gray-200 font-mono text-sm overflow-x-auto">
            {mockClientId}
          </div>
          <button 
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-3 rounded-r-md border border-l-0 border-gray-200 transition-colors"
            onClick={() => copyToClipboard(mockClientId)}
          >
            {copied ? <Clipboard size={20} /> : <Copy size={20} />}
          </button>
        </div>
      </div>
      
      {/* Attribution Models section */}
      <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
        <AttributionModelManager
          clientId={mockClientId}
          models={mockAttributionModels}
          onSave={handleSaveModel}
          onDelete={handleDeleteModel}
        />
      </div>
      
      {/* Installation tabs */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              className={`px-5 py-3 text-sm font-medium ${
                activeTab === 'installation'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('installation')}
            >
              Website Installation
            </button>
            <button
              className={`px-5 py-3 text-sm font-medium ${
                activeTab === 'api'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('api')}
            >
              Server-Side API
            </button>
            <button
              className={`px-5 py-3 text-sm font-medium ${
                activeTab === 'gtm'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('gtm')}
            >
              Google Tag Manager
            </button>
          </nav>
        </div>
        
        <div className="p-5">
          {activeTab === 'installation' && (
            <Tab id="installation" label="Website Installation">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-2">1. Add the tracking script to your website</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Add the following script tag to the <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">&lt;head&gt;</code> section of your website. The script will automatically:
                    <ul className="list-disc ml-6 mt-2">
                      <li>Track page views</li>
                      <li>Capture UTM parameters</li>
                      <li>Track form submissions</li>
                      <li>Handle click IDs (fbclid, gclid, ttclid, msclkid)</li>
                      <li>Hash email addresses for privacy</li>
                    </ul>
                  </p>
                  
                  <div className="relative">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 font-mono text-sm overflow-x-auto">
                      {renderTrackerCode()}
                    </div>
                    <button 
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      onClick={() => copyToClipboard(renderTrackerCode())}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-2">2. Full Tracker Source Code</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    For reference, here's the complete source code of the tracker:
                  </p>
                  
                  <div className="relative">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 font-mono text-sm overflow-x-auto">
                      {renderFullTrackerCode()}
                    </div>
                    <button 
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      onClick={() => copyToClipboard(renderFullTrackerCode())}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-2">3. Track conversions</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Use the global <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">gTracker</code> object to manually track conversions:
                  </p>
                  
                  <div className="relative">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 font-mono text-sm overflow-x-auto">
                      {`// Call this when a conversion happens
gTracker.trackConversion('purchase', 99.99, 'USD');

// Other conversion types
gTracker.trackConversion('lead');
gTracker.trackConversion('signup');`}
                    </div>
                    <button 
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      onClick={() => copyToClipboard(`gTracker.trackConversion('purchase', 99.99, 'USD');`)}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-4">
                  <a 
                    href="#" 
                    className="text-blue-600 hover:text-blue-800 flex items-center transition-colors text-sm"
                  >
                    View Documentation <ExternalLink size={14} className="ml-1" />
                  </a>
                  <a 
                    href="#" 
                    className="text-blue-600 hover:text-blue-800 flex items-center transition-colors text-sm"
                  >
                    Advanced Options <ExternalLink size={14} className="ml-1" />
                  </a>
                </div>
              </div>
            </Tab>
          )}
          
          {activeTab === 'api' && (
            <Tab id="api" label="Server-Side API">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-2">Server-side conversion tracking</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Use our API to track conversions from your server. Include your API key in the <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">x-api-key</code> header.
                  </p>
                  
                  <div className="relative">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 font-mono text-sm overflow-x-auto">
                      {renderApiCode()}
                    </div>
                    <button 
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      onClick={() => copyToClipboard(renderApiCode())}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800 flex">
                  <Info size={18} className="flex-shrink-0 mt-1 mr-3 text-blue-500" />
                  <div>
                    <strong>Important:</strong> When using server-side tracking, you need to pass the visitor_id. You can retrieve this from your client-side cookie or localStorage.
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-4">
                  <a 
                    href="#" 
                    className="text-blue-600 hover:text-blue-800 flex items-center transition-colors text-sm"
                  >
                    API Reference <ExternalLink size={14} className="ml-1" />
                  </a>
                  <a 
                    href="#" 
                    className="text-blue-600 hover:text-blue-800 flex items-center transition-colors text-sm"
                  >
                    Server Libraries <ExternalLink size={14} className="ml-1" />
                  </a>
                </div>
              </div>
            </Tab>
          )}
          
          {activeTab === 'gtm' && (
            <Tab id="gtm" label="Google Tag Manager">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-2">Google Tag Manager Integration</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Use our GTM integration to capture conversions from your existing GTM setup:
                  </p>
                  
                  <div className="relative">
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 font-mono text-sm overflow-x-auto">
                      {renderGTMCode()}
                    </div>
                    <button 
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      onClick={() => copyToClipboard(renderGTMCode())}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-md font-semibold text-gray-800 mb-2">Setup Instructions</h3>
                  <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
                    <li>Install our tracker script on your website as shown in the Website Installation tab</li>
                    <li>Create a new Custom HTML tag in Google Tag Manager</li>
                    <li>Paste the code above into the tag</li>
                    <li>Set the tag to trigger on your existing purchase/conversion events</li>
                    <li>Save and publish your GTM container</li>
                  </ol>
                </div>
                
                <div className="mt-6 flex space-x-4">
                  <a 
                    href="#" 
                    className="text-blue-600 hover:text-blue-800 flex items-center transition-colors text-sm"
                  >
                    GTM Guide <ExternalLink size={14} className="ml-1" />
                  </a>
                  <a 
                    href="#" 
                    className="text-blue-600 hover:text-blue-800 flex items-center transition-colors text-sm"
                  >
                    Download Template <ExternalLink size={14} className="ml-1" />
                  </a>
                </div>
              </div>
            </Tab>
          )}
        </div>
      </div>
      
      {/* Verification and debugging */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Verification</h2>
        <p className="text-sm text-gray-600 mb-4">
          After you've installed the tracker, use our verification tool to ensure everything is working correctly.
        </p>
        
        {!showVerification && (
          <button 
            onClick={() => setShowVerification(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Code size={16} className="mr-2" />
            Verify Installation
          </button>
        )}

        {showVerification && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your website URL
              </label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={verificationUrl}
                    onChange={(e) => setVerificationUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={verifyTracker}
                  disabled={verificationStatus === 'loading'}
                  className={`
                    inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                    ${verificationStatus === 'loading' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  `}
                >
                  {verificationStatus === 'loading' && (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  )}
                  {verificationStatus === 'idle' && (
                    <Code size={16} className="mr-2" />
                  )}
                  {verificationStatus === 'success' && (
                    <CheckCircle size={16} className="mr-2" />
                  )}
                  {verificationStatus === 'failure' && (
                    <AlertTriangle size={16} className="mr-2" />
                  )}
                  {verificationStatus === 'loading' ? 'Checking...' : 'Check Now'}
                </button>
              </div>
            </div>

            {verificationStatus === 'success' && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Tracker verified successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>The tracking code is correctly installed on your website.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {verificationStatus === 'failure' && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Verification failed
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{verificationError || 'Could not verify the tracking code on your website.'}</p>
                      <ul className="list-disc ml-5 mt-2">
                        <li>Make sure you've added the tracking code to your website</li>
                        <li>Check that the URL is correct and accessible</li>
                        <li>Ensure the tracking code is in the <code className="bg-red-100 px-1 rounded">&lt;head&gt;</code> section</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 flex space-x-4">
          
          <a 
            href="#" 
            className="text-blue-600 hover:text-blue-800 flex items-center transition-colors text-sm"
          >
            View Debug Guide <ExternalLink size={14} className="ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;