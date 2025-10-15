"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Field, FieldSeparator } from '../ui/field';
import { BodyMedium, HeadingMedium, LabelLarge, LabelMedium } from '../utils';
import { PasswordInput, TextInput } from '../custom/input';
import router from 'next/router';
import { redirect } from 'next/navigation';


export default function SignInForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const t = useTranslations('home');

    const handleSubmit = (e: { preventDefault: () => void; }) => {
        e.preventDefault()
        // Handle form submission logic here
        console.log('Email:', email);
        console.log('Password:', password
        );

        //navigate to complete account page
        redirect('/complete-account');

    }

    return (
        <div className="w-full flex items-center justify-center ">
            <div>
                <div className="space-y-6">
                    <HeadingMedium>
                        {t("greeting1")}
                    </HeadingMedium>
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



                        <p className="text-sm  flex justify-between ">
                            <Link href="#" className="text-text-brand font-medium hover:underline">
                                <LabelLarge>
                                    Forgot Password ?
                                </LabelLarge>
                            </Link>
                            <Button onClick={handleSubmit} variant="outline" className="px-8 h-12 bg-surface-brand hover:bg-blue-700 text-white rounded-full">
                                Login
                            </Button>
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="flex-1 border-t border-gray-300"></div>
                            <span className="text-sm">or continue with</span>
                            <div className="flex-1 border-t border-gray-300"></div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <Button variant="outline" className="h-12 rounded-full">
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </Button>
                            <Button variant="outline" className="h-12 rounded-full">
                                <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                                Facebook
                            </Button>
                            <Button variant="outline" className="h-12 rounded-full">
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                X (Twitter)
                            </Button>
                        </div>
                         <div className='flex items-center justify-center gap-2'>
                        
                                        <BodyMedium className="text-center text-sm ">
                        
                                       New to Diaspora Connect Global?
                                        </BodyMedium>
                                      <Link href="/signup" className="text-text-brand font-medium hover:underline">
                                      <LabelLarge>
                        
                                        Create an account
                                      </LabelLarge>
                                      </Link>
                                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}