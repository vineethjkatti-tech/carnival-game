const LABELS = [
  { name: 'Work', color: '#1a73e8' },
  { name: 'Personal', color: '#188038' },
  { name: 'Finance', color: '#e37400' },
  { name: 'Travel', color: '#9334e6' },
  { name: 'News', color: '#c5221f' },
];

const EMAILS = [
  {
    id: 1,
    from: 'Elena Vasquez',
    fromEmail: 'hr@gravitonindustries.com',
    to: 'you@gmail.com',
    subject: 'Notice of Termination of Employment',
    date: '10:04 AM',
    read: false,
    starred: false,
    labels: ['Work'],
    category: 'Primary',
    important: true,
    avatar: 'G',
    avatarColor: '#1a73e8',
    attachments: [{ name: 'Letter_of_Termination.pdf', size: '248 KB' }],
    snippet: 'We regret to inform you that your employment with Graviton Industries has been terminated, effective immediately. Please review the attached letter of termination...',
    body: `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#202124;line-height:1.6;">
        <p style="margin:0 0 16px 0;">Dear [Your Name],</p>
        <p style="margin:0 0 16px 0;">We are writing to formally inform you that your employment with <strong>Graviton Industries</strong> has been <strong>terminated, effective immediately</strong>.</p>
        <p style="margin:0 0 16px 0;">Following the company-wide restructuring announced earlier this quarter, your position as <strong>Product Engineering Lead</strong> has been eliminated. This decision is final and takes effect today.</p>
        <p style="margin:0 0 16px 0;">Please review the attached letter of termination, which details the following:</p>
        <ul style="margin:0 0 16px 0;padding-left:24px;">
          <li>Your final paycheck, including accrued vacation payout, to be issued within 14 business days.</li>
          <li>Information regarding continued health coverage under COBRA and your 401(k) rollover options.</li>
          <li>Return of all company property (laptop, security badge, and access keys) by end of business today.</li>
          <li>Your ongoing obligations under the Employee Confidentiality and Non-Disclosure Agreement signed on January 8, 2024.</li>
        </ul>
        <p style="margin:0 0 16px 0;">Access to all company systems, repositories, and data has been revoked as of this notice.</p>
        <br>
        <p>If you would like to discuss this decision or have any questions, please click <a href="/start.html">here</a>.</p>
        <p style="margin:0 0 16px 0;">We appreciate your contributions during your time at Graviton and wish you the best in your future endeavors.</p>
        <p style="margin:0 0 4px 0;">Sincerely,</p>
        <p style="margin:0 0 16px 0;">Elena Vasquez<br/>Director of Human Resources<br/>Graviton Industries</p>
        <div style="border-top:1px solid #dadce0;padding-top:12px;font-size:12px;color:#5f6368;">
          <strong>Confidential.</strong> This email and the attached letter are the property of Graviton Industries and may contain privileged information. If you are not the intended recipient, please notify the sender immediately.
        </div>
      </div>
    `,
  },
];