import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useActor } from "../hooks/useActor";
import { useStudentSession } from "../hooks/useStudentSession";

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}odg_salt_2024`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function MatchIndicator({
  a,
  b,
  minLen,
}: { a: string; b: string; minLen?: number }) {
  if (!a || !b) return null;
  const ok = a === b && (!minLen || a.length >= minLen);
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : (
    <XCircle className="h-4 w-4 text-red-400" />
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  const labels = ["", "Weak", "Fair", "Medium", "Strong", "Very Strong"];
  const colors = [
    "",
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
    "bg-emerald-500",
  ];
  const textColors = [
    "",
    "text-red-500",
    "text-orange-500",
    "text-yellow-600",
    "text-green-600",
    "text-emerald-600",
  ];

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i <= strength ? colors[strength] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${textColors[strength]}`}>
        {labels[strength]}
      </span>
    </div>
  );
}

export default function Signup() {
  const { actor } = useActor();
  const { setStudentSession } = useStudentSession();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Success screen
  const [successId, setSuccessId] = useState("");

  const today = new Date().toISOString().split("T")[0];

  function validate(): string | null {
    if (!name.trim()) return "Please enter your full name";
    if (!confirmName.trim()) return "Please confirm your full name";
    if (name.trim() !== confirmName.trim()) return "Names do not match";
    if (!dob) return "Please enter your date of birth";
    if (!email.trim()) return "Please enter your email";
    if (!confirmEmail.trim()) return "Please confirm your email";
    if (email.trim() !== confirmEmail.trim()) return "Emails do not match";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "Please enter a valid email";
    if (!phone.trim()) return "Please enter your phone number";
    if (!confirmPhone.trim()) return "Please confirm your phone number";
    if (phone.trim() !== confirmPhone.trim())
      return "Phone numbers do not match";
    if (!/^[6-9]\d{9}$/.test(phone.trim()))
      return "Please enter a valid 10-digit Indian mobile number";
    if (!password) return "Please set a password";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    return null;
  }

  function handleCreateAccount() {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError("");
    setShowConfirmDialog(true);
  }

  async function handleConfirmedSubmit() {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    try {
      if (!actor) throw new Error("Not connected to backend");
      const hashed = await hashPassword(password);
      const result = await (actor as any).registerStudent(
        name.trim(),
        email.trim(),
        phone.trim(),
        dob,
        hashed,
      );
      if ("ok" in result) {
        setSuccessId(result.ok);
        setStudentSession({
          studentId: result.ok,
          name: name.trim(),
          email: email.trim(),
          loggedInAt: Date.now(),
        });
      } else {
        setFormError(result.err || "Registration failed. Please try again.");
      }
    } catch (e) {
      setFormError("Registration failed. Please try again.");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Success screen
  if (successId) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.22 0.08 255) 0%, oklch(0.18 0.12 265) 50%, oklch(0.14 0.06 260) 100%)",
        }}
      >
        <div
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
          data-ocid="signup.success_state"
        >
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-9 w-9 text-green-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
            Account Created!
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Welcome to OdiGyan. Your account is ready.
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
            <p className="text-xs text-blue-500 font-medium mb-1 uppercase tracking-wide">
              Your Student ID
            </p>
            <p className="font-mono text-xl font-bold text-blue-700">
              {successId}
            </p>
            <p className="text-xs text-blue-400 mt-1">
              Save this for future reference
            </p>
          </div>

          <Button
            className="w-full h-11 rounded-xl font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.45 0.2 255), oklch(0.38 0.22 265))",
            }}
            onClick={() => void navigate({ to: "/" })}
            data-ocid="signup.primary_button"
          >
            Start Learning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.22 0.08 255) 0%, oklch(0.18 0.12 265) 50%, oklch(0.14 0.06 260) 100%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.5 0.2 255), oklch(0.42 0.22 270))",
          }}
        >
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-white leading-none">
            OdiGyan
          </h1>
          <p className="text-white/50 text-xs">Create your account</p>
        </div>
      </div>

      {/* Notice card */}
      <div
        className="mx-4 mb-4 rounded-2xl px-4 py-3"
        style={{
          background: "oklch(0.5 0.2 255 / 0.3)",
          border: "1px solid oklch(0.6 0.2 255 / 0.3)",
        }}
      >
        <div className="flex gap-2.5 items-start">
          <AlertCircle className="h-4 w-4 text-blue-300 mt-0.5 shrink-0" />
          <div>
            <p className="text-white text-xs font-semibold mb-0.5">
              Important Notice
            </p>
            <p className="text-white/70 text-xs leading-relaxed">
              Please provide your authentic name, email, date of birth and phone
              number. These details will be used to verify your identity and
              cannot be changed later.
            </p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div
        className="mx-4 mb-6 rounded-3xl bg-white p-5 shadow-2xl"
        data-ocid="signup.dialog"
      >
        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Full Name
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Input
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl text-sm"
                  data-ocid="signup.input"
                />
              </div>
              <div className="relative">
                <Input
                  placeholder="Confirm name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="h-11 rounded-xl pr-9 text-sm"
                  data-ocid="signup.input"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <MatchIndicator a={name} b={confirmName} />
                </span>
              </div>
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Date of Birth
            </Label>
            <Input
              type="date"
              value={dob}
              max={today}
              onChange={(e) => setDob(e.target.value)}
              className="h-11 rounded-xl text-sm"
              data-ocid="signup.input"
            />
          </div>

          {/* Email */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Email Address
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl text-sm"
                autoComplete="email"
                data-ocid="signup.input"
              />
              <div className="relative">
                <Input
                  type="email"
                  placeholder="Confirm email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className="h-11 rounded-xl pr-9 text-sm"
                  data-ocid="signup.input"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <MatchIndicator a={email} b={confirmEmail} />
                </span>
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Phone Number
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="tel"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                className="h-11 rounded-xl text-sm"
                inputMode="numeric"
                data-ocid="signup.input"
              />
              <div className="relative">
                <Input
                  type="tel"
                  placeholder="Confirm phone"
                  value={confirmPhone}
                  onChange={(e) =>
                    setConfirmPhone(
                      e.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  className="h-11 rounded-xl pr-9 text-sm"
                  inputMode="numeric"
                  data-ocid="signup.input"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <MatchIndicator a={phone} b={confirmPhone} minLen={10} />
                </span>
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Password
            </Label>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl pr-11 text-sm"
                  autoComplete="new-password"
                  data-ocid="signup.input"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <PasswordStrength password={password} />
              <div className="relative">
                <Input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-xl pr-11 text-sm"
                  autoComplete="new-password"
                  data-ocid="signup.input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  tabIndex={-1}
                >
                  {showConfirmPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <span className="absolute right-10 top-1/2 -translate-y-1/2">
                  <MatchIndicator a={password} b={confirmPassword} minLen={6} />
                </span>
              </div>
            </div>
          </div>

          {formError && (
            <div
              className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5"
              data-ocid="signup.error_state"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span className="text-red-500 text-xs font-medium">
                {formError}
              </span>
            </div>
          )}

          <Button
            className="w-full h-12 text-base font-semibold rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.45 0.2 255), oklch(0.38 0.22 265))",
            }}
            onClick={handleCreateAccount}
            disabled={isSubmitting}
            data-ocid="signup.submit_button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:text-blue-700"
              data-ocid="signup.link"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
          data-ocid="signup.modal"
        >
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-display text-lg font-bold text-gray-900 text-center mb-2">
              Confirm Your Details
            </h3>
            <p className="text-gray-500 text-sm text-center mb-1">
              Are you sure all your details are correct?
            </p>
            <p className="text-gray-400 text-xs text-center mb-5">
              Name, email and phone number are{" "}
              <strong className="text-gray-600">permanent</strong> and cannot be
              changed.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11 rounded-xl font-medium"
                onClick={() => setShowConfirmDialog(false)}
                data-ocid="signup.cancel_button"
              >
                Go Back
              </Button>
              <Button
                className="h-11 rounded-xl font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.45 0.2 255), oklch(0.38 0.22 265))",
                }}
                onClick={() => void handleConfirmedSubmit()}
                data-ocid="signup.confirm_button"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
