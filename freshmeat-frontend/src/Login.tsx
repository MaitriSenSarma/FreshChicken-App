
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import api from "./api";
import "./Login.css";

type LoginProps = {
  onClose: () => void;
  onLogin: (userLabel: string) => void;
};

type Method = "phone" | "email";
type AccountMode = "signin" | "signup";

type PhoneOtpResponse = {
  detail: string;
};

type PhoneLoginResponse = {
  access: string;
  refresh: string;
  user: {
    id: number;
    phone: string;
    label: string;
  };
};

export default function Login({ onClose, onLogin }: LoginProps) {
  const [accountMode, setAccountMode] =
    useState<AccountMode>("signin");
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

  function resetMessages() {
    setError("");
    setNotice("");
  }

  function switchMethod(next: Method) {
    setMethod(next);
    setStep("details");
    setOtp("");
    resetMessages();
  }

  function switchMode(next: AccountMode) {
    setAccountMode(next);
    setStep("details");
    setOtp("");
    setConfirmPassword("");
    resetMessages();
  }

  function getErrorMessage(requestError: unknown): string {
    const err = requestError as {
      response?: {
        status?: number;
        data?: Record<string, unknown>;
      };
      message?: string;
    };

    const data = err.response?.data;

    if (data && typeof data === "object") {
      const messages = Object.entries(data).flatMap(
        ([, value]) => {
          if (typeof value === "string") return [value];
          if (Array.isArray(value)) return value.map(String);
          return [];
        }
      );

      if (messages.length) return messages.join(" ");
    }

    if (err.response?.status === 429) {
      return "Too many requests. Please wait before trying again.";
    }

    if (err.response?.status === 401) {
      return "Authentication failed. Please try again.";
    }

    return (
      err.message ||
      "Unable to connect to FreshMeat. Check that Django is running."
    );
  }

  // Send a real SMS OTP through Django and 2Factor.
  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (accountMode === "signup" && name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post<PhoneOtpResponse>(
        "/auth/phone/send-otp/",
        { phone: phone.trim() }
      );

      setOtp("");
      setStep("otp");
      setNotice(
        response.data.detail ||
          "SMS OTP request accepted. Check your messages."
      );
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Verify the SMS OTP and save JWT tokens for checkout.
  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the six-digit OTP received by SMS.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post<PhoneLoginResponse>(
        "/auth/phone/verify-otp/",
        {
          phone: phone.trim(),
          otp: otp.trim(),
        }
      );

      const { access, refresh, user } = response.data;

      if (!access || !refresh || !user?.phone) {
        throw new Error(
          "Authentication server did not return the required login details."
        );
      }

      const userLabel =
        accountMode === "signup" && name.trim()
          ? name.trim()
          : user.label || user.phone;

      localStorage.setItem("freshmeat-access-token", access);
      localStorage.setItem("freshmeat-refresh-token", refresh);

      localStorage.setItem("freshmeat-user", userLabel);

      setNotice(
        accountMode === "signup"
          ? "Phone verified. Your account is ready."
          : "Phone verified. You are signed in."
      );

      onLogin(userLabel);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resendOtp() {
    // The backend enforces a 60-second resend cooldown.
    await requestOtpFromResend();
  }

  async function requestOtpFromResend() {
    resetMessages();
    setIsSubmitting(true);

    try {
      const response = await api.post<PhoneOtpResponse>(
        "/auth/phone/send-otp/",
        { phone: phone.trim() }
      );

      setOtp("");
      setNotice(
        response.data.detail ||
          "A new SMS OTP request was accepted."
      );
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Existing email/password registration and login.
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

    if (
      accountMode === "signup" &&
      password !== confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (accountMode === "signup") {
        await api.post("/auth/register/", {
          username: normalizedEmail,
          email: normalizedEmail,
          password,
        });
      }

      const response = await api.post<{
  access: string;
  refresh: string;
}>("/auth/login/", {
  email: normalizedEmail,
  password,
});

      const { access, refresh } = response.data;

      if (!access || !refresh) {
        throw new Error(
          "The authentication API did not return tokens."
        );
      }

      const userLabel =
        accountMode === "signup" && name.trim()
          ? name.trim()
          : normalizedEmail;

      localStorage.setItem("freshmeat-access-token", access);
      localStorage.setItem("freshmeat-refresh-token", refresh);

      localStorage.setItem("freshmeat-user", userLabel);

      setNotice(
        accountMode === "signup"
          ? "Your account was created and you are signed in."
          : "You are signed in successfully."
      );

      onLogin(userLabel);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  const action =
    accountMode === "signup" ? "Create Account" : "Sign In";

  return (
    <div
      className="fm-login-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="fm-login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fm-login-title"
      >
        <button
          className="fm-login-close"
          onClick={onClose}
          aria-label="Close login"
        >
          <X size={21} />
        </button>

        <div className="fm-login-brand">
          <span className="fm-login-brand-mark">F</span>
          <span>
            Fresh<span>Meat</span>
          </span>
        </div>

        <div className="fm-login-intro">
          <span className="fm-login-kicker">
            WELCOME TO FRESHMEAT
          </span>
          <h1 id="fm-login-title">
            {accountMode === "signup"
              ? "Create your account."
              : "Welcome back."}
          </h1>
          <p>
            {accountMode === "signup"
              ? "Join FreshMeat for a fresher, easier shopping experience."
              : "Sign in to manage your cart and keep your favourite picks close."}
          </p>
        </div>

        <div className="fm-account-switch" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={accountMode === "signin"}
            className={accountMode === "signin" ? "active" : ""}
            onClick={() => switchMode("signin")}
          >
            Sign In
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={accountMode === "signup"}
            className={accountMode === "signup" ? "active" : ""}
            onClick={() => switchMode("signup")}
          >
            New Customer? Sign Up
          </button>
        </div>

        <div className="fm-login-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={method === "phone"}
            className={method === "phone" ? "active" : ""}
            onClick={() => switchMethod("phone")}
          >
            <Phone size={17} /> Phone OTP
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={method === "email"}
            className={method === "email" ? "active" : ""}
            onClick={() => switchMethod("email")}
          >
            <Mail size={17} /> Email & Password
          </button>
        </div>

        {method === "phone" ? (
          step === "details" ? (
            <form
              className="fm-login-form"
              onSubmit={requestOtp}
            >
              {accountMode === "signup" && (
                <>
                  <label htmlFor="fm-name-phone">Full name</label>
                  <div className="fm-input-icon">
                    <UserRound size={17} />
                    <input
                      id="fm-name-phone"
                      autoComplete="name"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </>
              )}

              <label htmlFor="fm-phone">Mobile number</label>
              <div className="fm-phone-field">
                <span>🇮🇳 +91</span>
                <input
                  id="fm-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, ""))
                  }
                />
              </div>

              <button
                className="fm-login-primary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Sending OTP..."
                  : accountMode === "signup"
                    ? "Create Account with OTP"
                    : "Continue with OTP"}
                <span>→</span>
              </button>

              <p className="fm-login-small">
                <ShieldCheck size={15} />
                We'll use your number for account verification.
              </p>
            </form>
          ) : (
            <form
              className="fm-login-form"
              onSubmit={verifyOtp}
            >
              <button
                className="fm-login-back"
                type="button"
                onClick={() => {
                  setStep("details");
                  setOtp("");
                  resetMessages();
                }}
              >
                <ArrowLeft size={16} /> Change number
              </button>

              <label htmlFor="fm-otp">
                Enter verification code
              </label>

              <p className="fm-login-hint">
                SMS code requested for +91 {phone}
              </p>

              <input
                className="fm-otp-input"
                id="fm-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, ""))
                }
              />

              <button
                className="fm-login-primary"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Verifying..."
                  : accountMode === "signup"
                    ? "Verify & Create Account"
                    : "Verify & Sign In"}
                <span>→</span>
              </button>

              <button
                className="fm-login-resend"
                type="button"
                onClick={resendOtp}
                disabled={isSubmitting}
              >
                Resend code
              </button>
            </form>
          )
        ) : (
          <form
            className="fm-login-form"
            onSubmit={submitEmail}
          >
            {accountMode === "signup" && (
              <>
                <label htmlFor="fm-name-email">Full name</label>
                <div className="fm-input-icon">
                  <UserRound size={17} />
                  <input
                    id="fm-name-email"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </>
            )}

            <label htmlFor="fm-email">Email address</label>
            <input
              id="fm-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label htmlFor="fm-password">Password</label>
            <div className="fm-password-field">
              <input
                id="fm-password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  accountMode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {accountMode === "signup" && (
              <>
                <label htmlFor="fm-confirm-password">
                  Confirm password
                </label>
                <div className="fm-password-field">
                  <input
                    id="fm-confirm-password"
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                      setShowConfirmPassword((v) => !v)
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </>
            )}

            <button
              className="fm-login-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Please wait..." : action}
              <span>→</span>
            </button>

            <p className="fm-login-small">
              <ShieldCheck size={15} />
              Email registration and login use the Django backend.
            </p>
          </form>
        )}

        {notice && (
          <div className="fm-login-notice" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="fm-login-error" role="alert">
            {error}
          </div>
        )}

        <div className="fm-login-terms">
          By continuing, you agree to FreshMeat's{" "}
          <a
            href="#terms"
            onClick={(e) => {
              e.preventDefault();
              setNotice(
                "Add your client's Terms & Conditions URL before launch."
              );
            }}
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="#privacy"
            onClick={(e) => {
              e.preventDefault();
              setNotice(
                "Add your client's Privacy Policy URL before launch."
              );
            }}
          >
            Privacy Policy
          </a>
          .
        </div>

        <div className="fm-login-demo">
          <CheckCircle2 size={15} />
          Phone OTP and email/password use the Django backend.
        </div>
      </section>
    </div>
  );
}
