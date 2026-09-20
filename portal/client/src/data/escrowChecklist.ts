// Generated from "Underwriting Checklist.xlsx". Item ids are stored with each deal's progress, so keep them stable.
export interface ChecklistItemDef {
  id: string;
  task: string;
  description: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItemDef[];
}

export const ESCROW_CHECKLIST: ChecklistSection[] = [
  {
    "id": "initial-documents",
    "title": "Initial Documents",
    "items": [
      {
        "id": "initial-documents-executed-term-sheet",
        "task": "Executed Term Sheet",
        "description": "Do not proceed until term sheet is executed and deposit received"
      },
      {
        "id": "initial-documents-confirm-deposit-received",
        "task": "Confirm Deposit Received",
        "description": "Do not proceed until term sheet is executed and deposit received"
      },
      {
        "id": "initial-documents-executed-loan-application",
        "task": "Executed Loan Application",
        "description": "Send Borrower our loan application as soon as above is received"
      }
    ]
  },
  {
    "id": "property-information",
    "title": "Property information",
    "items": [
      {
        "id": "property-information-property-operating-statement",
        "task": "Property Operating Statement",
        "description": "YTD and prior 2 years are ideal"
      },
      {
        "id": "property-information-current-rent-roll",
        "task": "Current Rent Roll",
        "description": "Should be within 30 days of loan application"
      },
      {
        "id": "property-information-copy-of-all-leases",
        "task": "Copy of all leases",
        "description": "All amendments should be included"
      },
      {
        "id": "property-information-real-estate-taxes",
        "task": "Real Estate Taxes",
        "description": "Check county records and ensure they are current"
      },
      {
        "id": "property-information-appraisal",
        "task": "Appraisal",
        "description": "Order as soon as deposit is received"
      },
      {
        "id": "property-information-phase-1-environmental",
        "task": "Phase 1 Environmental",
        "description": "Order as soon as deposit is received"
      },
      {
        "id": "property-information-physical-site-inspection",
        "task": "Physical site inspection",
        "description": "If the property is close by, do it early in the process. If far, OK to wait until further along."
      }
    ]
  },
  {
    "id": "guarantor-1",
    "title": "Guarantor 1",
    "items": [
      {
        "id": "guarantor-1-two-forms-of-id",
        "task": "Two Forms of ID",
        "description": "Driver's License and Passport are ideal"
      },
      {
        "id": "guarantor-1-personal-financial-statement",
        "task": "Personal Financial Statement",
        "description": "Send Guarantor our PFS template"
      },
      {
        "id": "guarantor-1-credit-report",
        "task": "Credit Report",
        "description": "Order credit report as soon as possible (need deposit, loan application and IDs)"
      },
      {
        "id": "guarantor-1-background-check-lexis-nexis",
        "task": "Background Check (Lexis Nexis)",
        "description": "Order credit report as soon as possible (need deposit, loan application and IDs)"
      },
      {
        "id": "guarantor-1-verification-of-liquidity",
        "task": "Verification of liquidity",
        "description": "Request 3 months of personal bank statements"
      },
      {
        "id": "guarantor-1-meet-guarantor",
        "task": "Meet Guarantor",
        "description": "In person, at the property, is ideal"
      },
      {
        "id": "guarantor-1-negative-news-search-internet-search",
        "task": "Negative news search (internet search)",
        "description": "Simple internet search is sufficient. This can also be ordered via third party if you want to go deeper."
      }
    ]
  },
  {
    "id": "guarantor-2-if-applicable",
    "title": "Guarantor 2 (if applicable)",
    "items": [
      {
        "id": "guarantor-2-if-applicable-two-forms-of-id",
        "task": "Two Forms of ID",
        "description": "Driver's License and Passport are ideal"
      },
      {
        "id": "guarantor-2-if-applicable-personal-financial-statement",
        "task": "Personal Financial Statement",
        "description": "Send Guarantor our PFS template"
      },
      {
        "id": "guarantor-2-if-applicable-credit-report",
        "task": "Credit Report",
        "description": "Order credit report as soon as possible"
      },
      {
        "id": "guarantor-2-if-applicable-background-check-lexis-nexis",
        "task": "Background Check (Lexis Nexis)",
        "description": "Order background as soon as possible"
      },
      {
        "id": "guarantor-2-if-applicable-verification-of-liquidity",
        "task": "Verification of liquidity",
        "description": "Request 3 months of personal bank statements"
      },
      {
        "id": "guarantor-2-if-applicable-meet-guarantor",
        "task": "Meet Guarantor",
        "description": "In person, at the property, is ideal"
      },
      {
        "id": "guarantor-2-if-applicable-negative-news-search-internet-search",
        "task": "Negative news search (internet search)",
        "description": "Simple internet search is sufficient. This can also be ordered via third party if you want to go deeper."
      }
    ]
  },
  {
    "id": "entity-documents",
    "title": "Entity Documents",
    "items": [
      {
        "id": "entity-documents-operating-agreement-and-all-amendments",
        "task": "Operating Agreement and all amendments",
        "description": "Request immediately"
      },
      {
        "id": "entity-documents-federal-taxpayer-id-ein",
        "task": "Federal Taxpayer ID (EIN)",
        "description": "Request immediately"
      },
      {
        "id": "entity-documents-articles-of-organization",
        "task": "Articles of Organization",
        "description": "Request immediately"
      },
      {
        "id": "entity-documents-certificate-of-good-standing",
        "task": "Certificate of Good Standing",
        "description": "Request immediately"
      },
      {
        "id": "entity-documents-ownership-structure",
        "task": "Ownership Structure",
        "description": "Request immediately"
      },
      {
        "id": "entity-documents-background-check-lexis-nexis",
        "task": "Background Check (Lexis Nexis)",
        "description": "Order as soon as deposit is received"
      },
      {
        "id": "entity-documents-negative-news-search-internet-search",
        "task": "Negative news search (internet search)",
        "description": "Simple internet search is sufficient. This can also be ordered via third party if you want to go deeper."
      }
    ]
  },
  {
    "id": "title-insurance",
    "title": "Title Insurance",
    "items": [
      {
        "id": "title-insurance-title-commitment",
        "task": "Title Commitment",
        "description": "Order as soon as deposit is received"
      },
      {
        "id": "title-insurance-current-survey",
        "task": "Current Survey",
        "description": "Request immediately. Send to title company and ensure an updated survey is not required."
      },
      {
        "id": "title-insurance-lien-search-borrower",
        "task": "Lien Search: Borrower",
        "description": "UCC, tax liens and judgments"
      },
      {
        "id": "title-insurance-lien-search-guarantor-s",
        "task": "Lien Search: Guarantor(s)",
        "description": "UCC, tax liens and judgments"
      }
    ]
  },
  {
    "id": "property-insurance",
    "title": "Property Insurance",
    "items": [
      {
        "id": "property-insurance-general-liability-insurance",
        "task": "General Liability Insurance",
        "description": "$1M minimum coverage. Lender to be added as mortgagee."
      },
      {
        "id": "property-insurance-hazard-insurance",
        "task": "Hazard Insurance",
        "description": "Minimum coverage should be our loan amount. Insurer's may only offer replacement cost. If that is the case, check land value. Replacement cost + land value needs to exceed our loan amount. Lender to be added as mortgagee."
      },
      {
        "id": "property-insurance-windstorm-insurance-if-applicable",
        "task": "Windstorm Insurance (if applicable)",
        "description": "Minimum coverage should be our loan amount. Insurer's may only offer replacement cost. If that is the case, check land value. Replacement cost + land value needs to exceed our loan amount. Lender to be added as mortgagee."
      },
      {
        "id": "property-insurance-flood-insurance-if-applicable",
        "task": "Flood Insurance (if applicable)",
        "description": "Federal flood coverage limit is $500K for commercial and $250K for residential. Lender to be added as mortgagee."
      },
      {
        "id": "property-insurance-other-specialty-insurance-if-applicable",
        "task": "Other Specialty Insurance (if applicable)",
        "description": "Location specific"
      },
      {
        "id": "property-insurance-obtain-flood-zone-certificate",
        "task": "Obtain Flood Zone Certificate",
        "description": "Flood Zone X = not in a flood zone. AE = high risk of flood."
      }
    ]
  },
  {
    "id": "loan-closing",
    "title": "Loan closing",
    "items": [
      {
        "id": "loan-closing-prepare-loan-documents",
        "task": "Prepare loan documents",
        "description": "Retain attorney as soon as deposit is received. Engage title and start drafting loan documents. We should use the same loan documents for every deal. Only modify for state specific reasons. We do not negotiate loan documents with the Borrower."
      },
      {
        "id": "loan-closing-borrower-counsel-opinion-letter",
        "task": "Borrower counsel opinion letter",
        "description": "Check with our attorney early in process. Complicated entity structures may require an opinion letter."
      },
      {
        "id": "loan-closing-copy-of-any-management-agreement-if-applicable",
        "task": "Copy of any management agreement (if applicable)",
        "description": "Check if a property management agreement is in place. If so, we need it."
      },
      {
        "id": "loan-closing-estoppel-letters-snda",
        "task": "Estoppel letters & SNDA",
        "description": "Be flexible on Estoppels. We aren't a bank and do not need 100%. Obtain the ones that are critical."
      },
      {
        "id": "loan-closing-void-check-for-ach-set-up",
        "task": "Void check for ACH set up",
        "description": "ACH can be a requirement in the loan documents. It makes servicing the loan easier. Closing package will have an ACH authorization form for the borrower to complete."
      }
    ]
  }
];
