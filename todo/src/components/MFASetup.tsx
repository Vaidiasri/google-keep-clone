import { useState, useEffect } from "react";
import apiClient from "../lib/axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, QrCode } from "lucide-react";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface MFASetupProps {
  tempToken: string; // Token used to authorize setup
  onSuccess: (tokens: { token: string; user: any }) => void;
}

const MFASetup = ({ tempToken, onSuccess }: MFASetupProps) => {
  const [step, setStep] = useState<"LOADING" | "SCAN" | "VERIFY">("LOADING");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initiate Setup and get QR Code
    const fetchSetup = async () => {
      try {
        // We typically attach tempToken to headers
        apiClient.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${tempToken}`;
        const res = await apiClient.post("/auth/mfa/setup");
        setQrCode(res.data.qr_code);
        setSecret(res.data.secret);
        setStep("SCAN");
      } catch (err) {
        setError("Failed to load MFA Setup. Please try logging in again.");
      }
    };
    fetchSetup();
  }, [tempToken]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Confirm Setup
      // Backend expects MFAVerify schema: { otp: string, temp_token: string }
      const res = await apiClient.post("/auth/mfa/verify", {
        otp,
        temp_token: tempToken,
      });
      // Success - we get real token back
      onSuccess(res.data); // { token, user }
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "LOADING") {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <CardHeader className="space-y-4 flex flex-col items-center text-center pb-2">
        <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center">
          <QrCode className="h-6 w-6 text-indigo-600" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">
            Secure Your Account
          </CardTitle>
          <CardDescription>
            Scan the QR code with authenticator app
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}

        {/* QR Code Display */}
        <div className="flex justify-center p-4 bg-white rounded-xl border border-slate-200">
          {qrCode && (
            <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
          )}
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Enter 6-digit OTP</Label>
            <Input
              id="otp"
              placeholder="000 000"
              className="text-center text-lg tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              "Verify & Enable MFA"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-center text-xs text-slate-400">
        <p>
          Manual Entry Secret:{" "}
          <span className="font-mono text-slate-600">{secret}</span>
        </p>
      </CardFooter>
    </>
  );
};

export default MFASetup;
