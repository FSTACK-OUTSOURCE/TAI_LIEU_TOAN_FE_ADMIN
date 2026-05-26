"use client";

import { guidEmpty } from "@/app/constans";
import QuickCreateDocument from "./QuickCreateDocument";

export default function QuickCreateDocumentPage() {
    return (
        <QuickCreateDocument
            onClose={() => {}}
            parentDocumentId={guidEmpty}
            documentId={null}
        />
    );
}
