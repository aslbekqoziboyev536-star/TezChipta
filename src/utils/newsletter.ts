/**
 * Newsletter System - Integration Guide
 * 
 * Bu fayl newsletter tizimini loyiha bilan integratsiya qilishni tushuntiradi.
 */

// ===== FRONTEND INTEGRATSIYASI =====

// 1. NewsletterSubscription komponentasini Home sahifasiga qo'shish:
// import NewsletterSubscription from '@/components/NewsletterSubscription';
//
// <NewsletterSubscription 
//   variant="default" // 'default' | 'compact' | 'modal'
//   onSuccess={() => console.log('Subscribed!')}
//   showMessage={true}
// />

// 2. Admin Panel-da NewsletterAdmin komponentasini qo'shish:
// import NewsletterAdmin from '@/components/NewsletterAdmin';
//
// <NewsletterAdmin idToken={authToken} />

// ===== API ENDPOINTSLARI =====

/*
1. Newsletter-ga obuna qilish (Public)
   POST /api/newsletter/subscribe
   Body: { email: string }
   Response: { message: string, subscribed: boolean, subscriberId?: string }

2. Newsletter-dan obunan chiqish (Public)
   POST /api/newsletter/unsubscribe
   Body: { email: string }
   Response: { message: string, unsubscribed: boolean }

3. Obunachilar ro'yxatini olish (Admin)
   GET /api/admin/newsletter/subscribers
   Headers: { Authorization: `Bearer ${idToken}` }
   Response: { count: number, subscribers: Subscriber[] }

4. Newsletter jo'natish (Admin)
   POST /api/admin/newsletter/send
   Headers: { Authorization: `Bearer ${idToken}` }
   Body: {
     subject: string,
     message: string,
     htmlContent?: string
   }
   Response: { success: boolean, message: string, newsletterId: string, recipientCount: number }

5. Newsletter tarixini olish (Admin)
   GET /api/admin/newsletter/history
   Headers: { Authorization: `Bearer ${idToken}` }
   Response: { count: number, newsletters: Newsletter[] }
*/

// ===== FIRESTORE COLLECTIONS STRUKTURA =====

/*
Collection: newsletter_subscribers
{
  email: string (normalized lowercase)
  subscribedAt: ISO DateTime
  status: 'active' | 'unsubscribed'
  unsubscribeToken: string (for future unsubscribe links)
}

Collection: newsletters
{
  subject: string
  message: string
  htmlContent?: string
  recipientCount: number
  sentAt: ISO DateTime
  sentBy: string (email or UID)
  status: 'sent' | 'scheduled' | 'failed'
}
*/

// ===== EMAIL INTEGRATSIYASI =====

/*
Hozirda, newsletter xabarlar serverga jo'natiladi va Firestore-da saqlanadi,
lekin haqiqiy emaillar jo'natilmaydi. 

Real email jo'natish uchun quyidagi xizmatlardan birini integratsiya qiling:

1. SendGrid
   - npm install @sendgrid/mail
   - SENDGRID_API_KEY environment variable qo'shing
   
2. Mailgun
   - npm install mailgun.js
   - MAILGUN_DOMAIN va MAILGUN_API_KEY qo'shing
   
3. Firebase Cloud Functions
   - Cloud Firestore triggers yordamida Nodemailer ishlating
   
4. AWS SES
   - aws-sdk package ishlating

Integratsiya qilish uchun server.ts-dagi Example integration code ni dekompilatsiya qiling
va xizmatni integratsiya qiling.
*/

// ===== ENVIRONMENT VARIABLES =====
/*
// .env fayliga qo'shing:

// SendGrid uchun (ixtiyoriy)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@tezchipta.uz

// Mailgun uchun (ixtiyoriy)
MAILGUN_DOMAIN=your_domain.mailgun.org
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_FROM_EMAIL=noreply@tezchipta.uz

// Firebase Email uchun (ixtiyoriy)
FIREBASE_EMAIL_SERVICE=smtp.gmail.com
FIREBASE_EMAIL_ADDRESS=your_email@gmail.com
FIREBASE_EMAIL_PASSWORD=your_app_password
*/

// ===== VITE CONFIG QOLADI =====
/*
Vite config allaqachon o'rnatilgan, hech nima o'zgartirishga shart emas.
Newsletter komponentalari standart React komponentsalari sifatida ishlaydi.
*/

// ===== TYPESCRIPT TYPES =====

export interface Subscriber {
  id: string;
  email: string;
  subscribedAt: string;
  status: 'active' | 'unsubscribed';
  unsubscribeToken: string;
}

export interface Newsletter {
  id: string;
  subject: string;
  message: string;
  htmlContent?: string | null;
  recipientCount: number;
  sentAt: string;
  sentBy: string;
  status: 'sent' | 'scheduled' | 'failed';
}

export interface NewsletterSubscriptionResponse {
  message: string;
  subscribed?: boolean;
  subscriberId?: string;
  error?: string;
}

export interface SendNewsletterRequest {
  subject: string;
  message: string;
  htmlContent?: string;
}

export interface SendNewsletterResponse {
  success: boolean;
  message: string;
  newsletterId: string;
  recipientCount: number;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get auth token from Firebase
 */
export const getAuthToken = async (auth: any): Promise<string> => {
  try {
    return await auth.currentUser?.getIdToken(true) || '';
  } catch (error) {
    console.error('Error getting auth token:', error);
    return '';
  }
};

/**
 * Subscribe to newsletter
 */
export const subscribeToNewsletter = async (email: string): Promise<NewsletterSubscriptionResponse> => {
  try {
    const response = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await response.json();
  } catch (error) {
    console.error('Subscription error:', error);
    return { message: 'Xatolik yuz berdi', error: String(error) };
  }
};

/**
 * Unsubscribe from newsletter
 */
export const unsubscribeFromNewsletter = async (email: string): Promise<NewsletterSubscriptionResponse> => {
  try {
    const response = await fetch('/api/newsletter/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return await response.json();
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return { message: 'Xatolik yuz berdi', error: String(error) };
  }
};

/**
 * Get all subscribers (admin only)
 */
export const getSubscribers = async (idToken: string): Promise<Subscriber[]> => {
  try {
    const response = await fetch('/api/admin/newsletter/subscribers', {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    const data = await response.json();
    return data.subscribers || [];
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return [];
  }
};

/**
 * Send newsletter to all subscribers (admin only)
 */
export const sendNewsletter = async (
  idToken: string,
  payload: SendNewsletterRequest
): Promise<SendNewsletterResponse> => {
  try {
    const response = await fetch('/api/admin/newsletter/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending newsletter:', error);
    return {
      success: false,
      message: 'Newsletter jo\'natishda xatolik yuz berdi',
      newsletterId: '',
      recipientCount: 0
    };
  }
};

/**
 * Get newsletter history (admin only)
 */
export const getNewsletterHistory = async (idToken: string): Promise<Newsletter[]> => {
  try {
    const response = await fetch('/api/admin/newsletter/history', {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    const data = await response.json();
    return data.newsletters || [];
  } catch (error) {
    console.error('Error fetching newsletter history:', error);
    return [];
  }
};

// ===== EMAIL TEMPLATE HELPERS =====

/**
 * HTML email template generator
 */
export const generateHTMLEmailTemplate = (
  subject: string,
  content: string,
  logo?: string,
  footer?: string
): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .content { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    a { color: #007bff; text-decoration: none; }
    button { background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logo ? `<img src="${logo}" alt="Logo" style="max-width: 200px;">` : ''}
      <h1>${subject}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      ${footer || '<p>© 2026 TezChipta. Barcha huquqlar himoyalangan.</p>'}
      <p><a href="${process.env.APP_URL || 'https://tezchipta.uz'}/newsletter/unsubscribe">Obunan chiqish</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export default {
  validateEmail,
  getAuthToken,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
  getSubscribers,
  sendNewsletter,
  getNewsletterHistory,
  generateHTMLEmailTemplate
};
