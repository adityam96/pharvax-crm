import React, { useState } from 'react';
import { Building2, Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        setIsSuccess(false);
      } else {
        setMessage('Password reset email sent! Please check your inbox and follow the instructions.');
        setIsSuccess(true);
        setEmail(''); // Clear the form
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Company Info */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="Pharvax Biosciences"
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pharvax Biosciences</h1>
          <p className="text-gray-600">Reset Your Password</p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <Building2 className="w-8 h-8 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Forgot Password</h2>
          </div>

          {/* Back to Login Link */}
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-green-600 hover:text-green-700 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">{message}</span>
            </div>
          )}

          {!isSuccess ? (
            <>
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Send Reset Email'
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Sent!</h3>
                <p className="text-sm text-gray-600 mb-4">
                  We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <h4 className="text-sm font-medium text-blue-900 mb-2">What's next?</h4>
                <ul className="text-xs text-blue-800 space-y-1 text-left">
                  <li>• Check your email inbox (and spam folder)</li>
                  <li>• Click the reset link in the email</li>
                  <li>• Create a new password</li>
                  <li>• Sign in with your new password</li>
                </ul>
              </div>

              <Link
                to="/login"
                className="inline-flex items-center text-sm text-green-600 hover:text-green-700 transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>&copy; 2024 Pharvax Biosciences. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;