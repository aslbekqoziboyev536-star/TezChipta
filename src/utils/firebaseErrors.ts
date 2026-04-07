export const getFirebaseErrorMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred. Please check the Errors page.';
  
  let code = error.code;
  let message = error.message;

  // Extract code from message if missing (e.g. "Firebase: Error (auth/popup-closed-by-user).")
  if (!code && typeof message === 'string' && message.includes('(') && message.includes(')')) {
    const match = message.match(/\(([^)]+)\)/);
    if (match) code = match[1];
  }

  // Handle JSON string from handleFirestoreError
  if (typeof message === 'string' && message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.error) return parsed.error;
    } catch {
      // Not a valid JSON, continue with normal processing
    }
  }

  let translatedMessage = '';
  let errorCode = '500';

  switch (code) {
    case 'auth/popup-closed-by-user':
      translatedMessage = 'Login was cancelled. The popup was closed.';
      errorCode = '400';
      break;
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      translatedMessage = 'Incorrect email or password.';
      errorCode = '401';
      break;
    case 'auth/email-already-in-use':
      translatedMessage = 'This email is already registered.';
      errorCode = '401';
      break;
    case 'auth/weak-password':
      translatedMessage = 'Password is too weak.';
      errorCode = '401';
      break;
    case 'auth/invalid-email':
      translatedMessage = 'Invalid email address format.';
      errorCode = '401';
      break;
    case 'auth/network-request-failed':
      translatedMessage = 'Network error. Please check your connection.';
      errorCode = 'NETWORK_ERROR';
      break;
    case 'auth/too-many-requests':
      translatedMessage = 'Too many attempts. Please try again later.';
      errorCode = '429';
      break;
    case 'auth/user-disabled':
      translatedMessage = 'This user account has been disabled.';
      errorCode = '403';
      break;
    case 'permission-denied':
      translatedMessage = 'You do not have permission to perform this action.';
      errorCode = '403';
      break;
    case 'unavailable':
      translatedMessage = 'The service is temporarily unavailable.';
      errorCode = '503';
      break;
    case 'deadline-exceeded':
      translatedMessage = 'The request took too long to complete.';
      errorCode = '504';
      break;
    case 'not-found':
      translatedMessage = 'The requested document was not found.';
      errorCode = '404';
      break;
    case 'already-exists':
      translatedMessage = 'The document already exists.';
      errorCode = '409';
      break;
    case 'resource-exhausted':
      translatedMessage = 'The resource quota has been exceeded.';
      errorCode = '429';
      break;
    case 'failed-precondition':
      translatedMessage = 'The request failed due to a system precondition.';
      errorCode = '412';
      break;
    case 'aborted':
      translatedMessage = 'The operation was aborted.';
      errorCode = '409';
      break;
    case 'out-of-range':
      translatedMessage = 'The operation was out of range.';
      errorCode = '400';
      break;
    case 'unimplemented':
      translatedMessage = 'The operation is not implemented.';
      errorCode = '501';
      break;
    case 'internal':
      translatedMessage = 'An internal server error occurred.';
      errorCode = '500';
      break;
    case 'data-loss':
      translatedMessage = 'Unrecoverable data loss or corruption.';
      errorCode = '500';
      break;
    case 'unauthenticated':
      translatedMessage = 'The request does not have valid authentication credentials.';
      errorCode = '401';
      break;
    default:
      translatedMessage = message || 'An unexpected error occurred.';
      errorCode = '500';
  }

  return `${translatedMessage} Error code: ${errorCode}. Please check the Errors page for solutions.`;
};
