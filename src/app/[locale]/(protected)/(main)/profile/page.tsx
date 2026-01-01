/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { NavigationTabs } from '@/components/profile/NavigationTabs';
import { PersonalDetails } from '@/components/profile/PersonalDetails';
import { ProfileCompletion } from '@/components/profile/ProfileCompletion';
import { KYCVerification } from '@/components/profile/KYCVerification';
import { TrustScore } from '@/components/profile/TrustScore';
import { DUMMY_USERS } from '@/data/users';
import { useMutation, useQuery } from "@apollo/client/react";
import { GET_MY_PROFILE, GetProfileResponse, Profile } from "@/services/gql/profile";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import CustomDialog from "@/components/custom/customDialog";
import { ButtonType2 } from "@/components/custom/button";
import { CircularImageCropper } from "@/lib/imagecropper";
import { gql } from "@apollo/client";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useUserStore } from "@/store/useUserStore";

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      success
      message
      profile {
        id
        email
        avatarUrl
        firstName
        lastName
        version
      }
    }
  }
`;

interface UpdateProfileResponse {
  updateProfile: {
    success: boolean;
    message: string;
    profile: Profile;
  };
}

export default function ProfilePage() {
    const setUser = useUserStore(state => state.setUser);
    const [editAvatarOpen, setEditAvatarOpen] = useState(false);

    const { data, loading, error, refetch } = useQuery<GetProfileResponse>(GET_MY_PROFILE);
    const profile: Profile | undefined = data?.getProfile.profile;

    // Use the image upload hook
    const {
        uploading,
        rawImage,
        croppedImage,
        showCropper,
        handleFileSelect,
        handleCropConfirm,
        handleCropCancel,
        uploadImage,
        reset,
    } = useImageUpload({
        category: 'avatar',
        onSuccess: async (publicUrl) => {
            // Update profile with the new avatar URL
            if (profile) {
                await updateProfile({
                    variables: {
                        input: {
                            version: profile.version || 1,
                            avatarUrl: publicUrl,
                        },
                    },
                });
            }
        },
        onError: (error) => {
            console.error('Avatar upload error:', error);
        },
    });

    // Update profile mutation
    const [updateProfile, { loading: updating }] = useMutation<UpdateProfileResponse>(UPDATE_PROFILE, {
        onCompleted: (res) => {
            if (res.updateProfile.success) {
                toast.success(res.updateProfile.message || "Profile picture updated");
                setEditAvatarOpen(false);
                reset(); // Reset the image upload state
                refetch(); // Refetch profile to get updated data
            } else {
                toast.error(res.updateProfile.message || "Update failed");
            }
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    console.log("Data response", data);
    console.log("profile info", profile);

    useEffect(() => {
        if (profile) {
            setUser({
                ...profile,
                firstName: profile.firstName,
                lastName: profile.lastName,
                email: profile.email,
                userId: profile.userId,
                role: profile.role,
                countryOfOrigin: profile.countryOfOrigin?.slice(0, 2).toUpperCase(),
            });
        }
    }, [profile?.firstName, profile?.lastName, profile?.email, profile, setUser]);

    const currentUser = DUMMY_USERS['me'];

    function handleVerifyKYC(): void {
        throw new Error('Function not implemented.');
    }

    function handleCompleteProfile(): void {
        throw new Error('Function not implemented.');
    }

    const handleAvatarUpload = async () => {
        if (!profile) {
            toast.error("Profile not loaded");
            return;
        }

        // Upload the image and get the public URL
        await uploadImage();
        // The onSuccess callback will handle updating the profile
    };

    return (
        <div className="flex flex-col lg:flex-row lg:space-x-5 my-2 space-y-2 lg:space-y-0 h-app-inner mx-2">
            {/* Profile Header - First on mobile, part of left column on desktop */}
            <div className="lg:w-[50vw] order-1 lg:order-none space-y-2 flex flex-col">
                <ProfileHeader
                    userId='me'
                    friendType={currentUser.friendType}
                    showFriendActions={false}
                    userData={profile}
                    connectionId={""}
                    onEditAvatar={() => {
                        reset();
                        setEditAvatarOpen(true);
                    }}
                />

                {/* Navigation Tabs - Last on mobile, after header on desktop */}
                <div className="hidden lg:block lg:order-none">
                    <NavigationTabs
                        userId='me'
                        isOwnProfile={true}
                        userData={profile}
                    />
                </div>
            </div>

            {/* Navigation Tabs - Last on mobile, after header on desktop */}
            <div className="order-3 lg:hidden">
                <NavigationTabs
                    userId='me'
                    isOwnProfile={true}
                    userData={profile}
                />
            </div>

            {/* Right Column - Second on mobile */}
            <div className="lg:w-[25vw] space-y-2 mb-4 order-2 lg:order-none">
                <div className='min-h-0'>
                    <ProfileCompletion
                        percentage={profile?.profileCompletion?.percentage}
                        onCompleteProfile={handleCompleteProfile}
                    />
                </div>

                <div className='min-h-0'>
                    <KYCVerification
                        verified={profile?.verificationStatus}
                        onVerify={handleVerifyKYC}
                    />
                </div>

                <div className='min-h-0'>
                    <PersonalDetails data={profile?.createdAt} />
                </div>

                <div className='min-h-0'>
                    <TrustScore
                        trustScore={currentUser.trustScore}
                    />
                </div>
            </div>

            <CustomDialog
                title="Change profile picture"
                open={editAvatarOpen}
                onOpenChange={setEditAvatarOpen}
                showFooter={false}
                contentClassName="min-h-[50%] lg:min-h-[80%]"
            >
                <div className="lg:space-y-4 justify-center flex flex-col items-center">
                    {/* Circular Image Preview/Upload Area */}
                    <div className="flex justify-center lg:mb-20 my-6">
                        <label
                            htmlFor="avatar-upload"
                            className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer flex items-center justify-center overflow-hidden relative group transition-all"
                        >
                            {croppedImage ? (
                                <>
                                    <img
                                        src={croppedImage}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/20 bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-sm">Change</span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <svg
                                        className="w-8 h-8 mx-auto mb-2 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                        />
                                    </svg>
                                    <span className="text-xs text-gray-500">Click to upload</span>
                                </div>
                            )}
                        </label>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                        />
                    </div>

                    <ButtonType2
                        onClick={handleAvatarUpload}
                        disabled={!croppedImage || uploading || updating}
                        className="w-full py-3"
                    >
                        {uploading || updating ? "Uploading..." : "Upload"}
                    </ButtonType2>
                </div>
            </CustomDialog>

            {/* Circular Cropper */}
            {rawImage && (
                <CircularImageCropper
                    open={showCropper}
                    src={rawImage}
                    onCancel={handleCropCancel}
                    onConfirm={handleCropConfirm}
                />
            )}
        </div>
    );
}