import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Mail, Send, CheckCircle2, Save, AlertCircle, ShieldCheck, RefreshCw, Paperclip, Clock } from 'lucide-react';

interface EmailSettings {
  recipientEmail: string;
  recipientName: string;
  subjectPrefix: string;
  sendDailySales: boolean;
  sendShiftCheckout: boolean;
  sendExpenseAlerts: boolean;
}

interface DispatchLog {
  id: string;
  recipientEmail: string;
  subject: string;
  reportType: string;
  status: 'Delivered' | 'Pending';
  dispatchedAt: string;
}

export const AdminEmailSettings: React.FC = () => {
  const [settings, setSettings] = useState<EmailSettings>({
    recipientEmail: '',
    recipientName: 'Store Administrator',
    subjectPrefix: 'CreoCorp Billing Report',
    sendDailySales: true,
    sendShiftCheckout: true,
    sendExpenseAlerts: false,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSendingManual, setIsSendingManual] = useState<boolean>(false);
  
  const [manualReportType, setManualReportType] = useState<string>('Daily Sales Summary');
  const [customRecipient, setCustomRecipient] = useState<string>('');
  
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);

  const showToast = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    fetchEmailSettings();
  }, []);

  const fetchEmailSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/email-settings');
      if (res.data.status === 'success' && res.data.data) {
        setSettings(res.data.data);
        if (!customRecipient && res.data.data.recipientEmail) {
          setCustomRecipient(res.data.data.recipientEmail);
        }
      }
    } catch (err: any) {
      console.error('Failed to load email settings', err);
      showToast('Could not load email settings from server.', 'err');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.recipientEmail || !settings.recipientEmail.includes('@')) {
      showToast('Please enter a valid recipient email address.', 'err');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.put('/email-settings', settings);
      if (res.data.status === 'success') {
        showToast('Recipient email configuration saved successfully!', 'ok');
      } else {
        showToast(res.data.message || 'Failed to save settings.', 'err');
      }
    } catch (err: any) {
      console.error('Failed to save email settings', err);
      showToast(err.response?.data?.message || 'Error updating email settings.', 'err');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendManualEmail = async () => {
    const target = customRecipient || settings.recipientEmail;
    if (!target || !target.includes('@')) {
      showToast('Please enter a valid target email address.', 'err');
      return;
    }

    setIsSendingManual(true);
    try {
      const res = await apiClient.post('/email-settings/send-manual', {
        reportType: manualReportType,
        customRecipientEmail: target,
      });

      if (res.data.status === 'success') {
        showToast(`Report successfully dispatched to ${target}!`, 'ok');
        
        // Add entry to local dispatch log audit
        const newLog: DispatchLog = {
          id: String(Date.now()),
          recipientEmail: target,
          subject: res.data.dispatchSummary?.subject || `${settings.subjectPrefix} - ${manualReportType}`,
          reportType: manualReportType,
          status: 'Delivered',
          dispatchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setDispatchLogs((prev) => [newLog, ...prev]);
      } else {
        showToast(res.data.message || 'Failed to send report email.', 'err');
      }
    } catch (err: any) {
      console.error('Failed to send manual report email', err);
      showToast(err.response?.data?.message || 'Failed to send email report.', 'err');
    } finally {
      setIsSendingManual(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#161e28] p-6 rounded-2xl border border-[#1e2d3d] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#c9a84c]/15 border border-[#c9a84c]/30 rounded-xl text-[#c9a84c]">
            <Mail size={28} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#e8edf2] tracking-wide flex items-center gap-2">
              Email Dispatch & Target Recipient Settings
            </h1>
            <p className="text-xs text-[#5a6a7a] mt-0.5">
              Configure recipient email addresses for sales summaries, shift checkout audits, and automated notifications.
            </p>
          </div>
        </div>

        <button
          onClick={fetchEmailSettings}
          disabled={isLoading}
          className="px-4 py-2 bg-[#0d1117] border border-[#1e2d3d] rounded-lg text-xs font-bold text-[#5a6a7a] hover:text-[#c9a84c] hover:border-[#c9a84c]/40 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Settings</span>
        </button>
      </div>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: Recipient Settings Form (7 cols) ── */}
        <div className="lg:col-span-7 space-y-6">
          
          <form onSubmit={handleSaveSettings} className="bg-[#161e28] border border-[#1e2d3d] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-[#1e2d3d] pb-4">
              <ShieldCheck size={20} className="text-[#c9a84c]" />
              <h2 className="text-base font-bold text-[#e8edf2]">Target Email Configuration</h2>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#5a6a7a]">
                <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading email settings...</span>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {/* Recipient Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider flex items-center gap-1.5">
                      <Mail size={13} />
                      Send Reports To Email (Recipient) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. manager@creocorp.com or andigitalmount@gmail.com"
                      value={settings.recipientEmail}
                      onChange={(e) => setSettings({ ...settings, recipientEmail: e.target.value })}
                      className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-4 py-3 text-sm text-[#e8edf2] placeholder-[#5a6a7a] focus:border-[#c9a84c] outline-none transition-all duration-200"
                    />
                    <p className="text-[11px] text-[#5a6a7a]">
                      All shift checkouts, sales reports, and daily financial logs will be dispatched to this inbox.
                    </p>
                  </div>

                  {/* Recipient Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#e8edf2]/80 uppercase tracking-wider">
                      Recipient Name / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Store Owner / General Manager"
                      value={settings.recipientName}
                      onChange={(e) => setSettings({ ...settings, recipientName: e.target.value })}
                      className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-4 py-3 text-sm text-[#e8edf2] placeholder-[#5a6a7a] focus:border-[#c9a84c] outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Subject Prefix */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#e8edf2]/80 uppercase tracking-wider">
                      Email Subject Prefix
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CreoCorp Saloon Billing"
                      value={settings.subjectPrefix}
                      onChange={(e) => setSettings({ ...settings, subjectPrefix: e.target.value })}
                      className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-4 py-3 text-sm text-[#e8edf2] placeholder-[#5a6a7a] focus:border-[#c9a84c] outline-none transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Automation Toggles */}
                <div className="border-t border-[#1e2d3d] pt-5 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5a6a7a]">
                    Automated Email Notifications
                  </h3>

                  <label className="flex items-center justify-between p-3.5 bg-[#0d1117] border border-[#1e2d3d] rounded-xl cursor-pointer hover:border-[#c9a84c]/40 transition-all select-none">
                    <div>
                      <p className="text-xs font-bold text-[#e8edf2]">Daily Sales Summary Email</p>
                      <p className="text-[10px] text-[#5a6a7a]">Dispatches total revenue, transaction counts, and payment breakdowns.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.sendDailySales}
                      onChange={(e) => setSettings({ ...settings, sendDailySales: e.target.checked })}
                      className="w-4 h-4 accent-[#c9a84c] rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-[#0d1117] border border-[#1e2d3d] rounded-xl cursor-pointer hover:border-[#c9a84c]/40 transition-all select-none">
                    <div>
                      <p className="text-xs font-bold text-[#e8edf2]">Shift Checkout Audit Logs</p>
                      <p className="text-[10px] text-[#5a6a7a]">Dispatches individual shift revenue when cashier switches Offline.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.sendShiftCheckout}
                      onChange={(e) => setSettings({ ...settings, sendShiftCheckout: e.target.checked })}
                      className="w-4 h-4 accent-[#c9a84c] rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 bg-[#0d1117] border border-[#1e2d3d] rounded-xl cursor-pointer hover:border-[#c9a84c]/40 transition-all select-none">
                    <div>
                      <p className="text-xs font-bold text-[#e8edf2]">Expense Alerts & High Cost Log</p>
                      <p className="text-[10px] text-[#5a6a7a]">Dispatches notification whenever operational expenses are recorded.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.sendExpenseAlerts}
                      onChange={(e) => setSettings({ ...settings, sendExpenseAlerts: e.target.checked })}
                      className="w-4 h-4 accent-[#c9a84c] rounded cursor-pointer"
                    />
                  </label>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3.5 bg-gradient-to-r from-[#c9a84c] to-[#a07830] text-[#0d1117] font-black rounded-xl text-xs tracking-wider uppercase hover:shadow-[0_8px_24px_rgba(201,168,76,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-[#0d1117] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Email Configuration</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* ── RIGHT COLUMN: Manual Send Dispatcher & Recent Logs (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6">

          {/* Manual Dispatcher */}
          <div className="bg-[#161e28] border border-[#1e2d3d] rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-[#1e2d3d] pb-4">
              <Send size={18} className="text-[#00c97a]" />
              <h2 className="text-base font-bold text-[#e8edf2]">Send Report Email Now</h2>
            </div>

            <p className="text-xs text-[#5a6a7a] leading-relaxed">
              Manually compile and dispatch live billing reports to the configured email inbox instantly.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#e8edf2]/80 uppercase tracking-wider">
                  Report Type to Send
                </label>
                <select
                  value={manualReportType}
                  onChange={(e) => setManualReportType(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-4 py-3 text-xs font-semibold text-[#e8edf2] focus:border-[#00c97a] outline-none transition-all cursor-pointer"
                >
                  <option value="Daily Sales Summary">Daily Sales & Revenue Summary</option>
                  <option value="Shift Checkout Audit">Shift Checkout Audit Log</option>
                  <option value="Payment Modes Breakdown">Payment Modes & Expenses Audit</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#e8edf2]/80 uppercase tracking-wider">
                  Recipient Email
                </label>
                <input
                  type="email"
                  placeholder="Defaults to configured email"
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-xl px-4 py-3 text-xs text-[#e8edf2] focus:border-[#00c97a] outline-none transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleSendManualEmail}
                disabled={isSendingManual}
                className="w-full py-3.5 bg-[#00c97a]/15 border border-[#00c97a]/40 text-[#00c97a] font-bold rounded-xl text-xs tracking-wider uppercase hover:bg-[#00c97a] hover:text-[#0d1117] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSendingManual ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={15} />
                    <span>Dispatch Email Report Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Dispatch History Log */}
          <div className="bg-[#161e28] border border-[#1e2d3d] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2d3d] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#e8edf2] flex items-center gap-2">
                <Clock size={14} className="text-[#c9a84c]" />
                Recent Dispatched Logs
              </h3>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-[#5a6a7a] font-mono">Live Session</span>
            </div>

            {dispatchLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#5a6a7a] italic border border-dashed border-[#1e2d3d] rounded-xl">
                No manual dispatches during this session.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {dispatchLogs.map((log) => (
                  <div key={log.id} className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[#e8edf2]">
                      <span className="font-bold truncate max-w-[180px]">{log.reportType}</span>
                      <span className="text-[10px] text-[#00c97a] bg-[#00c97a]/10 border border-[#00c97a]/25 px-1.5 py-0.2 rounded flex items-center gap-1">
                        <CheckCircle2 size={10} /> Delivered
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#5a6a7a]">
                      <span className="truncate">{log.recipientEmail}</span>
                      <span className="font-mono text-[10px]">{log.dispatchedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── TOAST NOTIFICATION ── */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 border rounded-xl px-5 py-3.5 text-xs z-[9999] flex items-center gap-2.5 bg-[#161e28] shadow-2xl transition-all duration-300 ${
          toastMsg.type === 'ok' ? 'border-[#00c97a]/40 text-[#e8edf2]' : 'border-red-500/40 text-[#ff8080]'
        }`}>
          {toastMsg.type === 'ok' ? (
            <CheckCircle2 size={16} className="text-[#00c97a]" />
          ) : (
            <AlertCircle size={16} className="text-red-400" />
          )}
          <span className="font-medium">{toastMsg.text}</span>
        </div>
      )}

    </div>
  );
};
