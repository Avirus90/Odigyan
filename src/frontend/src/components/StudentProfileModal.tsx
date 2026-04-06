import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, GraduationCap, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useStudentSession } from "../hooks/useStudentSession";

type Mode = "check" | "register" | "link" | "done";

function MatchIndicator({ a, b }: { a: string; b: string }) {
  if (!a || !b) return null;
  return a === b ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : (
    <XCircle className="h-4 w-4 text-red-400" />
  );
}

export default function StudentProfileModal() {
  const { identity, isAdmin } = useInternetIdentity();
  const { actor } = useActor();
  const { studentSession, setStudentSession } = useStudentSession();

  const [mode, setMode] = useState<Mode>("check");
  const [visible, setVisible] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  // Link mode fields
  const [linkName, setLinkName] = useState("");
  const [linkDob, setLinkDob] = useState("");
  const [linkPhone, setLinkPhone] = useState("");
  const [linkEmail, setLinkEmail] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_successId, setSuccessId] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // When identity becomes available and no student session, check backend
  useEffect(() => {
    if (!identity || !actor) return;
    if (studentSession) return; // Already logged in

    const principal = identity.getPrincipal();
    if (principal.isAnonymous()) return;

    // Admin should never see the student profile popup
    if (isAdmin) return;

    setMode("check");
    setVisible(true);

    void (async () => {
      try {
        const profile = await (actor as any).getStudentByCallerPrincipal();
        if (profile && profile.length > 0) {
          // Principal is already mapped to a student
          const p = profile[0];
          setStudentSession({
            studentId: p.studentId,
            name: p.name,
            email: p.email,
            loggedInAt: Date.now(),
          });
          setVisible(false);
          setMode("done");
        } else {
          // New device or new user — show form
          setMode("register");
        }
      } catch {
        setMode("register");
      }
    })();
  }, [identity, actor, studentSession, setStudentSession, isAdmin]);

  // Admin should never see the student profile popup
  if (!visible || !identity || identity.getPrincipal().isAnonymous()) {
    return null;
  }
  if (isAdmin) {
    return null;
  }

  if (mode === "check") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-4 mx-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.5 0.2 255), oklch(0.42 0.22 270))",
            }}
          >
            <Loader2 className="h-7 w-7 text-white animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-bold text-gray-900 text-lg">
              Verifying Identity
            </p>
            <p className="text-sm text-gray-500 mt-1">Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "done") return null;

  async function handleRegister() {
    if (!name.trim()) return setError("Please enter your full name");
    if (!confirmName.trim()) return setError("Please confirm your full name");
    if (name.trim() !== confirmName.trim())
      return setError("Names do not match");
    if (!dob) return setError("Please enter your date of birth");
    if (!phone.trim()) return setError("Please enter your phone number");
    if (!confirmPhone.trim())
      return setError("Please confirm your phone number");
    if (phone.trim() !== confirmPhone.trim())
      return setError("Phone numbers do not match");
    if (!/^[6-9]\d{9}$/.test(phone.trim()))
      return setError("Enter a valid 10-digit Indian mobile number");
    if (!email.trim()) return setError("Please enter your email");
    if (!confirmEmail.trim()) return setError("Please confirm your email");
    if (email.trim() !== confirmEmail.trim())
      return setError("Emails do not match");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Please enter a valid email address");

    setError("");
    setIsSubmitting(true);
    try {
      const result = await (actor as any).registerStudentII(
        name.trim(),
        email.trim(),
        phone.trim(),
        dob,
      );
      if ("ok" in result) {
        setSuccessId(result.ok);
        setStudentSession({
          studentId: result.ok,
          name: name.trim(),
          email: email.trim(),
          loggedInAt: Date.now(),
        });
        setVisible(false);
        setMode("done");
      } else {
        // If email/phone exists, maybe device change
        if (
          (result.err as string)?.includes("Email already") ||
          (result.err as string)?.includes("Phone number already")
        ) {
          setError(
            `${result.err} — If this is your account on a new device, click "I already have an account".`,
          );
        } else {
          setError(result.err || "Registration failed. Please try again.");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLink() {
    if (!linkName.trim()) return setError("Please enter your full name");
    if (!linkDob) return setError("Please enter your date of birth");
    if (!linkPhone.trim()) return setError("Please enter your phone number");
    if (!linkEmail.trim()) return setError("Please enter your email");

    setError("");
    setIsSubmitting(true);
    try {
      const result = await (actor as any).linkPrincipalToStudent(
        linkName.trim(),
        linkEmail.trim(),
        linkPhone.trim(),
        linkDob,
      );
      if ("ok" in result) {
        setStudentSession({
          studentId: result.ok.studentId,
          name: result.ok.name,
          email: result.ok.email,
          loggedInAt: Date.now(),
        });
        setVisible(false);
        setMode("done");
      } else {
        setError(
          result.err || "Account verification failed. Check your details.",
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
        data-ocid="student_profile.modal"
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-5 sticky top-0 bg-white z-10 rounded-t-3xl"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.22 0.08 255) 0%, oklch(0.38 0.22 265) 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg leading-tight">
                {mode === "link"
                  ? "Verify Your Account"
                  : "Complete Your Profile"}
              </h2>
              <p className="text-blue-100 text-xs mt-0.5">
                {mode === "link"
                  ? "Enter your details to link this device"
                  : "Please fill in your details to get started"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {mode === "register" && (
            <>
              {/* Info box */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>Important:</strong> Please provide your authentic
                  name, date of birth, phone number and email. These details
                  will be used to verify your identity in future.
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Full Name
                </Label>
                <Input
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  className="h-11 rounded-xl"
                  data-ocid="student_profile.input"
                />
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Confirm full name"
                    value={confirmName}
                    onChange={(e) => {
                      setConfirmName(e.target.value);
                      setError("");
                    }}
                    className="h-11 rounded-xl"
                    data-ocid="student_profile.input"
                  />
                  <MatchIndicator a={name} b={confirmName} />
                </div>
              </div>

              {/* DOB */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Date of Birth
                </Label>
                <Input
                  type="date"
                  max={today}
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    setError("");
                  }}
                  className="h-11 rounded-xl"
                  data-ocid="student_profile.input"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError("");
                  }}
                  className="h-11 rounded-xl"
                  data-ocid="student_profile.input"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="tel"
                    placeholder="Confirm phone number"
                    value={confirmPhone}
                    onChange={(e) => {
                      setConfirmPhone(e.target.value);
                      setError("");
                    }}
                    className="h-11 rounded-xl"
                    data-ocid="student_profile.input"
                  />
                  <MatchIndicator a={phone} b={confirmPhone} />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="h-11 rounded-xl"
                  data-ocid="student_profile.input"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="Confirm email"
                    value={confirmEmail}
                    onChange={(e) => {
                      setConfirmEmail(e.target.value);
                      setError("");
                    }}
                    className="h-11 rounded-xl"
                    data-ocid="student_profile.input"
                  />
                  <MatchIndicator a={email} b={confirmEmail} />
                </div>
              </div>

              {error && (
                <div
                  className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5"
                  data-ocid="student_profile.error_state"
                >
                  <p className="text-red-600 text-xs font-medium">{error}</p>
                </div>
              )}

              <Button
                className="w-full h-12 rounded-xl font-semibold text-base"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.45 0.2 255), oklch(0.38 0.22 265))",
                }}
                onClick={() => void handleRegister()}
                disabled={isSubmitting}
                data-ocid="student_profile.submit_button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  "Create My Account"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMode("link");
                  setError("");
                }}
                className="w-full text-center text-sm text-blue-600 font-semibold py-2"
              >
                I already have an account (new device)
              </button>
            </>
          )}

          {mode === "link" && (
            <>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  Enter the same details you used when you first registered.
                  Your account will be linked to this device.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Full Name (as registered)
                </Label>
                <Input
                  placeholder="Your full name"
                  value={linkName}
                  onChange={(e) => {
                    setLinkName(e.target.value);
                    setError("");
                  }}
                  className="h-11 rounded-xl"
                  data-ocid="student_profile.input"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Date of Birth
                </Label>
                <Input
                  type="date"
                  max={today}
                  value={linkDob}
                  onChange={(e) => {
                    setLinkDob(e.target.value);
                    setError("");
                  }}
                  className="h-11 rounded-xl"
                  data-ocid="student_profile.input"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  placeholder="Registered phone number"
                  value={linkPhone}
                  onChange={(e) => {
                    setLinkPhone(e.target.value);
                    setError("");
                  }}
                  className="h-11 rounded-xl"
                  data-ocid="student_profile.input"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700">
                  Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="Registered email"
                  value={linkEmail}
                  onChange={(e) => {
                    setLinkEmail(e.target.value);
                    setError("");
                  }}
                  className="h-11 rounded-xl"
                  data-ocid="student_profile.input"
                />
              </div>

              {error && (
                <div
                  className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5"
                  data-ocid="student_profile.error_state"
                >
                  <p className="text-red-600 text-xs font-medium">{error}</p>
                </div>
              )}

              <Button
                className="w-full h-12 rounded-xl font-semibold text-base"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.45 0.2 255), oklch(0.38 0.22 265))",
                }}
                onClick={() => void handleLink()}
                disabled={isSubmitting}
                data-ocid="student_profile.submit_button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  "Link My Account"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className="w-full text-center text-sm text-gray-500 font-medium py-2"
              >
                Back to new registration
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
