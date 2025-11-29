/* eslint-disable @next/next/no-img-element */
import { ButtonType2 } from "@/components/custom/button";
import { Label } from "@/components/ui/label";
import {
    RadioGroup,
    RadioGroupItem,
} from "@/components/ui/radio-group";
import { ArrowLeft } from "lucide-react";

export function StartStep({ onNext }: { onNext: () => void }) {
    return (
        <div className="flex flex-col justify-between h-screen p-6">
            <div className="flex-1 overflow-y-auto">
                <h1 className="text-2xl font-bold mb-2">Verify your identity</h1>
                <p className="text-gray-600 mb-6">
                    We need to make sure it&apos;s really you. This will take less than a minute
                </p>

                <p className="font-semibold mb-3">What we will need</p>
                <ul className="list-disc list-inside text-left space-y-2">
                    <li>Passport / National ID number</li>
                    <li>Photo of Passport / National ID</li>
                    <li>Photo of you holding Passport / National ID</li>
                </ul>
            </div>

            <ButtonType2 onClick={onNext} className="py-3 rounded-xl w-full">
                Start verification
            </ButtonType2>
        </div>
    );
}

export function CountryStep({
    value,
    docType,
    onSelect,
    onDocTypeChange,
    onNext,
    onBack,
}: {
    value: string;
    docType: string;
    onSelect: (v: string) => void;
    onDocTypeChange: (v: string) => void;
    onNext: () => void;
    onBack: () => void;
}) {
    return (
        <div className="flex flex-col justify-between h-screen p-6">
            <div className="flex-1 overflow-y-auto">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-900"
                >
                    <ArrowLeft size={20} />
                </button>

                <p className="font-semibold text-lg mb-2">Pick a document for verification</p>
                <p className="text-gray-600 mb-4">We need a valid document and the country that issued the document.</p>

                <label className="block text-sm font-medium mb-2">ID issuing country</label>
                <select
                    value={value}
                    onChange={(e) => onSelect(e.target.value)}
                    className="w-full border p-3 rounded-xl mb-6"
                >
                    <option value="">Select country</option>
                    <option value="ghana">Ghana</option>
                    <option value="nigeria">Nigeria</option>
                    <option value="uk">United Kingdom</option>
                </select>

                <p className="block text-sm font-medium mb-3">Document type</p>

                <RadioGroup value={docType} onValueChange={onDocTypeChange}>
                    <div className="flex items-center gap-3 p-3 border rounded-lg mb-2">
                        <RadioGroupItem value="passport" id="r1" />
                        <Label htmlFor="r1">Passport (Photo page)</Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <RadioGroupItem value="national_id" id="r2" />
                        <Label htmlFor="r2">National ID card (Front and back)</Label>
                    </div>
                </RadioGroup>
            </div>

            <ButtonType2
                onClick={onNext}
                disabled={!value || !docType}
                className="py-3 rounded-xl w-full"
            >
                Continue
            </ButtonType2>
        </div>
    );
}

export function IdStep({
    value,
    onChange,
    onNext,
    onBack,
    docType,
}: {
    value: string;
    onChange: (v: string) => void;
    onNext: () => void;
    onBack: () => void;
    docType: string;
}) {
    const isPassport = docType === 'passport';
    const documentName = isPassport ? 'Passport' : 'National ID';

    return (
        <div className="flex flex-col justify-between h-screen p-6">
            <div className="flex-1 overflow-y-auto">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-900"
                >
                    <ArrowLeft size={20} />
                    
                </button>

                <h2 className="text-xl font-semibold mb-2">{documentName} number</h2>
                <p className="text-gray-600 mb-6">
                    Provide the {documentName.toLowerCase()} number on the valid {documentName}
                </p>

                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={`Enter your ${documentName.toLowerCase()} number`}
                    className="w-full p-3 border rounded-xl"
                />
            </div>

            <ButtonType2
                disabled={!value}
                onClick={onNext}
                className="py-3 rounded-xl w-full"
            >
                Continue
            </ButtonType2>
        </div>
    );
}

export function PhotoStep({
    frontImage,
    backImage,
    onFrontImageChange,
    onBackImageChange,
    onNext,
    onBack,
    docType,
}: {
    frontImage: string | null;
    backImage: string | null;
    onFrontImageChange: (image: string) => void;
    onBackImageChange: (image: string) => void;
    onNext: () => void;
    onBack: () => void;
    docType: string;
}) {
    const isPassport = docType === 'passport';
    const documentName = isPassport ? 'Passport' : 'National ID';

    const handleImageUpload = (
        e: React.ChangeEvent<HTMLInputElement>,
        side: "front" | "back"
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (side === "front") {
                    onFrontImageChange(result);
                } else {
                    onBackImageChange(result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col justify-between h-screen p-6">
            <div className="flex-1 overflow-y-auto">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-900"
                >
                    <ArrowLeft size={20} />
                    
                </button>

                <h2 className="text-xl font-semibold mb-2">
                    {isPassport ? `Photo of ${documentName}` : `Photos of ${documentName}`}
                </h2>
                <p className="text-gray-600 mb-6">
                    {isPassport
                        ? `Take a photo of the photo page of your valid ${documentName}`
                        : `Take photos of the front and back of the valid ${documentName}`
                    }
                </p>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                        {isPassport ? `${documentName} photo page` : `Front of ${documentName}`}
                    </label>
                    <label className="border-dashed border-2 p-10 text-center rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 min-h-[120px] ">
                        {frontImage ? (
                            <img src={frontImage} alt="Front" className="max-h-24 object-contain" />
                        ) : (
                            <span className="text-gray-500">Tap to take photo</span>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, "front")}
                        />
                    </label>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Back of {documentName}</label>
                    <label className="border-dashed border-2 p-10 text-center rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 min-h-[120px] ">
                        {backImage ? (
                            <img src={backImage} alt="Back" className="max-h-24 object-contain" />
                        ) : (
                            <span className="text-gray-500">Tap to take photo</span>
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, "back")}
                        />
                    </label>
                </div>
            </div>

            <ButtonType2
                onClick={onNext}
                disabled={!frontImage || !backImage}
                className="py-3 rounded-xl w-full"
            >
                Continue
            </ButtonType2>
        </div>
    );
}

export function SelfieStep({
    selfieImage,
    onSelfieImageChange,
    onNext,
    onBack,
    docType,
}: {
    selfieImage: string | null;
    onSelfieImageChange: (image: string) => void;
    onNext: () => void;
    onBack: () => void;
    docType: string;
}) {
    const isPassport = docType === 'passport';
    const documentName = isPassport ? 'Passport' : 'National ID';

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onSelfieImageChange(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col justify-between h-screen p-6">
            <div className="flex-1 overflow-y-auto">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 mb-4 hover:text-gray-900"
                >
                    <ArrowLeft size={20} />
                    
                </button>

                <h2 className="text-xl font-semibold mb-2">Photo of you holding {documentName}</h2>
                <ul className="text-gray-600 mb-6 space-y-1 list-disc list-inside">
                    <li>Make sure photo is taken in good light</li>
                    <li>Make sure {documentName.toLowerCase()} details are clearly visible</li>
                </ul>

                <label className="border-dashed border-2 p-10 text-center rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 min-h-[250px] ">
                    {selfieImage ? (
                        <img src={selfieImage} alt="Selfie" className="max-h-48 object-contain" />
                    ) : (
                        <>
                            <span className="text-gray-500 font-medium">
                                Take photo of you holding {documentName.toLowerCase()}
                            </span>
                            <span className="text-gray-400 text-sm mt-1">Tap to capture or upload</span>
                        </>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handleImageUpload}
                    />
                </label>
            </div>

            <ButtonType2
                onClick={onNext}
                disabled={!selfieImage}
                className="py-3 rounded-xl w-full"
            >
                Continue
            </ButtonType2>
        </div>
    );
}

export function VerifyingStep({ onNext }: { onNext: () => void }) {
    return (
        <div className="flex flex-col justify-between h-screen p-6">
            <div className="flex-1 overflow-y-auto items-center justify-center">
                <div className="mt-[40vh]">
                    <div className="text-green-600 text-6xl text-center mb-6">✓</div>
                    <h2 className="text-xl font-semibold mb-3 text-center">We are verifying you</h2>
                    <p className="text-secondary text-center">Our team is reviewing your documents. You will receive an email notification once you have been verified.</p>
                </div>
            </div>

            <ButtonType2
                onClick={onNext}
                className="py-3 rounded-xl w-full"
            >
                Continue
            </ButtonType2>
        </div>
    );
}

export function DoneStep() {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
            <div className="text-green-600 text-6xl mb-6">✓</div>
            <h2 className="text-2xl font-bold mb-2">Done</h2>
            <p className="text-gray-600">You can now login</p>
        </div>
    );
}