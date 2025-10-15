import { BodySmall, TextPrimary } from "../utils";

export default function InfoLinks() {
    return (
        < >
            <a href="#" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        About
                    </TextPrimary>
                </BodySmall>
            </a>
            <span>·</span>
            <a href="#" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        Terms
                    </TextPrimary>
                </BodySmall>
            </a>
            <span>·</span>
            <a href="#" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        Privacy Policy
                    </TextPrimary>
                </BodySmall></a>
            <span>·</span>
            <a href="#" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        Contact us
                    </TextPrimary>
                </BodySmall></a>
            <span>·</span>
            <span>
                <BodySmall>
                    <TextPrimary>
                        © DCG 2025
                    </TextPrimary>
                </BodySmall>
            </span>
        </>

    );
}
