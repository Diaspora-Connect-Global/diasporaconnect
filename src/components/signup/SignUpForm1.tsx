"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { BodyMedium, BorderDefault, HeadingMedium, LabelLarge, LabelMedium, SurfaceSubtle } from '../utils';
import { PasswordInput, TextInput } from '../custom/input';
import { redirect } from 'next/navigation';
import SignInProvider from '../home/SignInProvider';


export default function SignupForm1() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const t = useTranslations('home');

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault()
    // Handle form submission logic here
    console.log('Email:', email);
    console.log('Password:', password);
    //navigate to complete account page
    redirect('/complete-account');
  };

  return (
    <div className="w-full flex items-center justify-center">
      <div>
        <div className="space-y-6">
          <HeadingMedium>{t("greeting1")}</HeadingMedium>
          <div className="space-y-4">
            <TextInput
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="Your email"
              label="Email"
              id="email"
            />

            <PasswordInput
              id='password'
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              placeholder="Your new password"
              label="Create password"
            />
            
            <PasswordInput
              id='confirmPassword'
              password={confirmPassword}
              setPassword={setConfirmPassword}
              showPassword={showConfirmPassword}
              setShowPassword={setShowConfirmPassword}
              placeholder="Your new password"
              label="Confirm password"
            />
            
            <p className="text-text-primary text-sm">
              By continuing with signup, you agree to our{' '}
              <a href="#" className="text-text-brand hover:underline">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="#" className="text-text-brand hover:underline">
                Terms of Service
              </a>
            </p>

            <div className='flex justify-end'>
              <Button onClick={handleSubmit} variant="outline" className="px-8 h-12 bg-surface-brand hover:bg-blue-700 text-white rounded-full">
                Continue
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-sm">or continue with</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

           <SignInProvider/>
            
            <div className='flex items-center justify-center gap-2'>
              <BodyMedium className="text-center text-sm">
                Already having an account?
              </BodyMedium>
              <Link href="/signin" className="text-text-brand font-medium hover:underline">
                <LabelLarge>
                  Log in
                </LabelLarge>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}