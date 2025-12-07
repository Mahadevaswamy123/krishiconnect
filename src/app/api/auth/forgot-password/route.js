import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not for security
    if (!user) {
      return NextResponse.json(
        { message: "If an account exists with this email, you will receive a password reset link." },
        { status: 200 }
      );
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Set expiration time (1 hour from now)
    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 1);

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiredAt,
      },
    });

    // In a production environment, you would send an email here
    // For now, we'll just log the reset link
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-request/${resetToken}`;
    
    console.log("=".repeat(80));
    console.log("PASSWORD RESET REQUEST");
    console.log("=".repeat(80));
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`Reset Link: ${resetUrl}`);
    console.log(`Token expires at: ${expiredAt.toLocaleString()}`);
    console.log("=".repeat(80));
    console.log("\nNOTE: In production, this link would be sent via email.");
    console.log("For now, copy the link above and paste it in your browser.\n");

    // TODO: Send email with reset link
    // Example using nodemailer or similar:
    // await sendEmail({
    //   to: user.email,
    //   subject: "Password Reset Request",
    //   html: `Click here to reset your password: ${resetUrl}`
    // });

    return NextResponse.json(
      { 
        message: "If an account exists with this email, you will receive a password reset link.",
        // In development, include the link
        ...(process.env.NODE_ENV === 'development' && { resetUrl })
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json(
      { message: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
