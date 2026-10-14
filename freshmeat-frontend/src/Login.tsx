import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Mail, Phone, ShieldCheck, UserRound, X } from "lucide-react";
import api from "./api";
import "./Login.css";

type LoginProps = { onClose: () => void; onLogin: (userLabel: string) => void };
type Method = "phone" | "email";
type AccountMode = "signin" | "signup";

export default function Login({ onClose, onLogin }: LoginProps) {
  const [accountMode, setAccountMode] = useState<AccountMode>("signin");
  const [method, setMethod] = useState<Method>("phone");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetMessages() { setError(""); setNotice(""); }
  function switchMethod(next: Method) { setMethod(next); setStep("details"); setOtp(""); resetMessages(); }
  function switchMode(next: AccountMode) { setAccountMode(next); setStep("details"); setOtp(""); setConfirmPassword(""); resetMessages(); }

  function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); resetMessages();
    if (accountMode === "signup" && name.trim().length < 2) { setError("Please enter your full name."); return; }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) { setError("Enter a valid 10-digit Indian mobile number."); return; }
    setStep("otp");
    setNotice("Phone OTP is preview-only. No SMS is sent and it does not authenticate a real account. Use Email & Password for real backend login.");
  }
  function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); resetMessages();
    if (!/^\d{6}$/.test(otp) || otp !== "123456") { setError("For this frontend preview, enter the demo code 123456."); return; }
    setNotice("Demo OTP accepted for preview only. Phone authentication is not connected to Django yet. Use Email & Password to sign in.");
  }
  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    const normalizedEmail = email.trim().toLowerCase();

    if (accountMode === "signup" && name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (accountMode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (accountMode === "signup") {
        // The current Django registration endpoint requires a username.
        // Use the email address as the username for this frontend flow.
        await api.post("/auth/register/", {
          username: normalizedEmail,
          email: normalizedEmail,
          password,
        });
      }

      const response = await api.post<{ access: string; refresh: string }>(
        "/auth/login/",
        { username: normalizedEmail, password }
      );

      const { access, refresh } = response.data;
      if (!access || !refresh) {
        throw new Error("The authentication API did not return tokens.");
      }

      localStorage.setItem("freshmeat-access-token", access);
      localStorage.setItem("freshmeat-refresh-token", refresh);
      localStorage.setItem(
        "freshmeat-user",
        JSON.stringify({
          label: accountMode === "signup" && name.trim()
            ? name.trim()
            : normalizedEmail,
          email: normalizedEmail,
        })
      );

      setNotice(
        accountMode === "signup"
          ? "Your account was created and you are signed in."
          : "You are signed in successfully."
      );
      onLogin(
        accountMode === "signup" && name.trim()
          ? name.trim()
          : normalizedEmail
      );
    } catch (requestError: unknown) {
      const errorWithResponse = requestError as {
        response?: { status?: number; data?: Record<string, unknown> };
        message?: string;
      };
      const data = errorWithResponse.response?.data;

      if (data && typeof data === "object") {
        const messages = Object.entries(data).flatMap(([field, value]) =>
          Array.isArray(value)
            ? [`${field}: ${value.join(" ")}`]
            : typeof value === "string"
              ? [`${field}: ${value}`]
              : []
        );
        setError(
          messages.join(" ") ||
            (errorWithResponse.response?.status === 401
              ? "Invalid email or password."
              : "Unable to complete the request. Please try again.")
        );
      } else {
        setError(
          errorWithResponse.message ||
            "Unable to connect to FreshMeat. Check that Django is running."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const action = accountMode === "signup" ? "Create Account" : "Sign In";

  return (
    <div className="fm-login-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="fm-login-dialog" role="dialog" aria-modal="true" aria-labelledby="fm-login-title">
        <button className="fm-login-close" onClick={onClose} aria-label="Close login"><X size={21} /></button>
        <div className="fm-login-brand"><span className="fm-login-brand-mark">F</span><span>Fresh<span>Meat</span></span></div>
        <div className="fm-login-intro">
          <span className="fm-login-kicker">WELCOME TO FRESHMEAT</span>
          <h1 id="fm-login-title">{accountMode === "signup" ? "Create your account." : "Welcome back."}</h1>
          <p>{accountMode === "signup" ? "Join FreshMeat for a fresher, easier shopping experience." : "Sign in to manage your cart and keep your favourite picks close."}</p>
        </div>

        <div className="fm-account-switch" role="tablist" aria-label="Account action">
          <button type="button" role="tab" aria-selected={accountMode === "signin"} className={accountMode === "signin" ? "active" : ""} onClick={() => switchMode("signin")}>Sign In</button>
          <button type="button" role="tab" aria-selected={accountMode === "signup"} className={accountMode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>New Customer? Sign Up</button>
        </div>

        <div className="fm-login-tabs" role="tablist" aria-label="Authentication method">
          <button type="button" role="tab" aria-selected={method === "phone"} className={method === "phone" ? "active" : ""} onClick={() => switchMethod("phone")}><Phone size={17} /> Phone OTP</button>
          <button type="button" role="tab" aria-selected={method === "email"} className={method === "email" ? "active" : ""} onClick={() => switchMethod("email")}><Mail size={17} /> Email & Password</button>
        </div>

        {method === "phone" ? (
          step === "details" ? (
            <form className="fm-login-form" onSubmit={requestOtp}>
              {accountMode === "signup" && <><label htmlFor="fm-name-phone">Full name</label><div className="fm-input-icon"><UserRound size={17} /><input id="fm-name-phone" autoComplete="name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} /></div></>}
              <label htmlFor="fm-phone">Mobile number</label>
              <div className="fm-phone-field"><span>🇮🇳 +91</span><input id="fm-phone" inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} /></div>
              <button className="fm-login-primary" type="submit">{accountMode === "signup" ? "Create Account with OTP" : "Continue with OTP"} <span>→</span></button>
              <p className="fm-login-small"><ShieldCheck size={15} /> We'll use your number for account verification.</p>
            </form>
          ) : (
            <form className="fm-login-form" onSubmit={verifyOtp}>
              <button className="fm-login-back" type="button" onClick={() => { setStep("details"); setError(""); setOtp(""); }}><ArrowLeft size={16} /> Change number</button>
              <label htmlFor="fm-otp">Enter verification code</label>
              <p className="fm-login-hint">Code requested for +91 {phone}</p>
              <input className="fm-otp-input" id="fm-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
              <button className="fm-login-primary" type="submit">{accountMode === "signup" ? "Verify & Create Account" : "Verify & Sign In"} <span>→</span></button>
              <button className="fm-login-resend" type="button" onClick={() => setNotice("OTP resend will be available when an SMS provider is connected.")}>Resend code</button>
            </form>
          )
        ) : (
          <form className="fm-login-form" onSubmit={submitEmail}>
            {accountMode === "signup" && <><label htmlFor="fm-name-email">Full name</label><div className="fm-input-icon"><UserRound size={17} /><input id="fm-name-email" autoComplete="name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} /></div></>}
            <label htmlFor="fm-email">Email address</label>
            <input id="fm-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="fm-password">Password</label>
            <div className="fm-password-field"><input id="fm-password" type={showPassword ? "text" : "password"} autoComplete={accountMode === "signup" ? "new-password" : "current-password"} placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            {accountMode === "signup" && <><label htmlFor="fm-confirm-password">Confirm password</label><div className="fm-password-field"><input id="fm-confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /><button type="button" aria-label={showConfirmPassword ? "Hide password" : "Show password"} onClick={() => setShowConfirmPassword((v) => !v)}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></>}
            <button className="fm-login-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Please wait..." : action} <span>→</span></button>
            <p className="fm-login-small"><ShieldCheck size={15} /> {accountMode === "signup" ? "Email registration and login use the Django backend." : "Email registration and login use the Django backend."}</p>
          </form>
        )}

        {notice && <div className="fm-login-notice" role="status">{notice}</div>}
        {error && <div className="fm-login-error" role="alert">{error}</div>}
        <div className="fm-login-terms">By continuing, you agree to FreshMeat's <a href="#terms" onClick={(e) => { e.preventDefault(); setNotice("Add your client's Terms & Conditions URL before launch."); }}>Terms</a> and <a href="#privacy" onClick={(e) => { e.preventDefault(); setNotice("Add your client's Privacy Policy URL before launch."); }}>Privacy Policy</a>.</div>
        <div className="fm-login-demo"><CheckCircle2 size={15} /> Email/password authentication is connected to Django. Phone OTP is still a demo.</div>
      </section>
    </div>
  );
}
