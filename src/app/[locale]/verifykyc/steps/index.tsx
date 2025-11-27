import { ButtonType2 } from "@/components/custom/button";
import { useEffect } from "react";
import { Label } from "@/components/ui/label"
import {
    RadioGroup,
    RadioGroupItem,
} from "@/components/ui/radio-group"

export function StartStep({ onNext }: { onNext: () => void }) {
    return (
        <section className="flex flex-col justify-center h-screen">
            <h1 className="text-xl font-bold mb-2">Verify your identity</h1>
            <p className="text-gray-500 mb-6">
                We need to make sure it&apos;s really you. This will take less than a minute
            </p>

            <p>What we will need</p>
            <ul className="list-disc list-inside mb-6 text-left">
                <li>Passport / National ID number</li>
                <li>Photo of Passport / National ID</li>
                <li>Photo of you holding Passport / National ID</li>
            </ul>
            <ButtonType2
                onClick={onNext}
                className="bg-blue-600 text-white py-3 rounded-xl"
            >
                Start verification
            </ButtonType2>
        </section>
    );
}

export function CountryStep({
    value,
    onSelect,
}: {
    value: string;
    onSelect: (v: string) => void;
}) {
    return (
        <div>
            <p className="font-semibold mb-4">Pick a document for verification</p>
            <p>We need a valid document and the country that issued the document.</p>
            <select
                value={value}
                onChange={(e) => onSelect(e.target.value)}
                className="w-full border p-3 rounded-xl"
            >
                <option value="">Select country</option>
                <option value="ghana">Ghana</option>
                <option value="nigeria">Nigeria</option>
                <option value="uk">United Kingdom</option>
            </select>




            <p>Document type</p>

            <RadioGroup defaultValue="comfortable">
                <div className="flex items-center gap-3">
                    <RadioGroupItem value="default" id="r1" />
                    <Label htmlFor="r1">Passport (Photo page)</Label>
                </div>
                <div className="flex items-center gap-3">
                    <RadioGroupItem value="comfortable" id="r2" />
                    <Label htmlFor="r2">National ID card (Front and back)</Label>
                </div>

            </RadioGroup>

            <ButtonType2
                onClick={() => onSelect("ghana")}
                className=" py-3 rounded-xl"
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
}: {
    value: string;
    onChange: (v: string) => void;
    onNext: () => void;
}) {
    return (
        <div>
            <h2 className="font-semibold mb-4">National ID number</h2>
            <p>Provide the ID number on the valid National ID card</p>

            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter your ID number"
                className="w-full p-3 border rounded-xl mb-4"
            />


            <ButtonType2
                disabled={!value}
                onClick={onNext} className=" py-3 rounded-xl"
            >
                Continue
            </ButtonType2>

        </div>
    );
}

export function PhotoStep({ onNext }: { onNext: () => void }) {
    return (
        <div>
            <h2 className="font-semibold mb-4">Photos of National ID</h2>
            <p>Scan the front and back of the valid National ID card</p>

            <div className="border-dashed border-2 p-10 text-center rounded-xl mb-4">
                Front of ID
            </div>

            <div className="border-dashed border-2 p-10 text-center rounded-xl mb-6">
                Back of ID
            </div>


            <ButtonType2
                onClick={onNext}
                className=" py-3 rounded-xl"
            >
                Continue
            </ButtonType2>
        </div>
    );
}

export function SelfieStep({ onNext }: { onNext: () => void }) {
    return (
        <div>
            <h2 className="font-semibold mb-4">Photo of you holding National ID</h2>
            <p>Make sure photo is taken in good light</p>
            <p>Make sure ID details are clearly visible</p>

            <div className="border-dashed border-2 p-10 text-center rounded-xl mb-6">
                Take photo of you holding ID
            </div>


            <ButtonType2
                onClick={onNext}
                className=" py-3 rounded-xl"
            >
                Continue
            </ButtonType2>
        </div>
    );
}

export function VerifyingStep({ onNext }: { onNext: () => void }) {
    useEffect(() => {
        const t = setTimeout(onNext, 3000);
        return () => clearTimeout(t);
    }, [onNext]);

    return (
        <div className="text-center mt-40">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <p>We are verifying you...</p>
            <p>Our team is reviewing your documents. You will receive an email notification once you have been verified.</p>
        </div>
    );
}

export function DoneStep() {
    return (
        <div className="text-center mt-40">
            <h2 className="font-bold text-xl mb-2">Done</h2>
            <p>You can now login</p>
        </div>
    );
}
