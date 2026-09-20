import { nanoid } from "nanoid";
import { db } from "./firebaseAdmin.js";
import { deleteLeadCascade } from "./firestoreHelpers.js";
import type { Stage, UseOfProceedsItem } from "./types.js";

interface SeedLead {
  borrower_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  property_address: string;
  city: string;
  state: string;
  asset_class: string;
  loan_type: string;
  loan_amount: number;
  purchase_price: number;
  equity_contribution: number;
  interest_rate: number | null;
  term_months: number;
  exit_strategy: string;
  sponsor_names: string[];
  use_of_proceeds: UseOfProceedsItem[];
  stage: Stage;
  lost_reason?: string;
  source: string;
  assigned_to: string;
  daysAgoCreated: number;
  daysAgoStageChange: number;
}

const seedLeads: SeedLead[] = [
  { borrower_name: "Harborview Partners LLC", contact_name: "Dana Keller", contact_email: "dana@harborviewpartners.com", contact_phone: "617-555-0142", property_address: "220 Seaport Blvd", city: "Boston", state: "MA", asset_class: "Multifamily", loan_type: "Acquisition", loan_amount: 8500000, purchase_price: 12000000, equity_contribution: 4000000, interest_rate: 7.25, term_months: 24, exit_strategy: "Refinance", sponsor_names: ["Dana Keller", "Marcus Whitfield"], use_of_proceeds: [{ category: "Interest Reserve", amount: 250000 }], stage: "Intake", source: "Broker Referral", assigned_to: "M. Alvarez", daysAgoCreated: 2, daysAgoStageChange: 2 },
  { borrower_name: "Sunbelt Storage Group", contact_name: "Reggie Combs", contact_email: "reggie@sunbeltstorage.com", contact_phone: "404-555-0187", property_address: "4501 Peachtree Industrial Blvd", city: "Atlanta", state: "GA", asset_class: "Self-Storage", loan_type: "Bridge", loan_amount: 4200000, purchase_price: 5600000, equity_contribution: 1600000, interest_rate: 9.5, term_months: 18, exit_strategy: "Refinance", sponsor_names: ["Reggie Combs"], use_of_proceeds: [{ category: "Renovation", amount: 600000 }, { category: "Interest Reserve", amount: 150000 }], stage: "Intake", source: "Website", assigned_to: "J. Nguyen", daysAgoCreated: 1, daysAgoStageChange: 1 },
  { borrower_name: "Desert Ridge Retail Trust", contact_name: "Paula Simmons", contact_email: "paula@desertridgeretail.com", contact_phone: "602-555-0119", property_address: "9800 N Tatum Blvd", city: "Phoenix", state: "AZ", asset_class: "Retail", loan_type: "Acquisition", loan_amount: 6300000, purchase_price: 9000000, equity_contribution: 2900000, interest_rate: 7.0, term_months: 24, exit_strategy: "Permanent Takeout", sponsor_names: ["Paula Simmons"], use_of_proceeds: [{ category: "Lien Pay-Off", amount: 200000 }], stage: "Qualified", source: "Repeat Client", assigned_to: "M. Alvarez", daysAgoCreated: 9, daysAgoStageChange: 3 },
  { borrower_name: "Cascade Logistics Partners", contact_name: "Ian Holt", contact_email: "ian@cascadelogistics.com", contact_phone: "206-555-0163", property_address: "1200 Airport Way S", city: "Seattle", state: "WA", asset_class: "Industrial", loan_type: "Construction", loan_amount: 15750000, purchase_price: 6000000, equity_contribution: 5000000, interest_rate: null, term_months: 30, exit_strategy: "Permanent Takeout", sponsor_names: ["Ian Holt", "Priya Desai"], use_of_proceeds: [{ category: "Construction", amount: 12500000 }, { category: "Interest Reserve", amount: 1200000 }], stage: "Qualified", source: "Broker Referral", assigned_to: "T. Osei", daysAgoCreated: 14, daysAgoStageChange: 5 },
  { borrower_name: "Lonestar Hospitality Group", contact_name: "Wendy Cruz", contact_email: "wendy@lonestarhg.com", contact_phone: "512-555-0104", property_address: "300 E 6th St", city: "Austin", state: "TX", asset_class: "Hospitality", loan_type: "Bridge", loan_amount: 11200000, purchase_price: 15000000, equity_contribution: 5200000, interest_rate: 10.25, term_months: 18, exit_strategy: "Sale / Disposition", sponsor_names: ["Wendy Cruz"], use_of_proceeds: [{ category: "Renovation", amount: 2000000 }, { category: "Interest Reserve", amount: 400000 }], stage: "Submitted", source: "Conference", assigned_to: "T. Osei", daysAgoCreated: 21, daysAgoStageChange: 6 },
  { borrower_name: "Magnolia Multifamily Fund", contact_name: "Corey Banks", contact_email: "corey@magnoliamf.com", contact_phone: "901-555-0176", property_address: "780 Union Ave", city: "Memphis", state: "TN", asset_class: "Multifamily", loan_type: "Acquisition", loan_amount: 9800000, purchase_price: 13500000, equity_contribution: 4200000, interest_rate: 6.85, term_months: 36, exit_strategy: "Refinance", sponsor_names: ["Corey Banks", "Denise Ford"], use_of_proceeds: [{ category: "Lien Pay-Off", amount: 500000 }], stage: "Submitted", source: "Website", assigned_to: "J. Nguyen", daysAgoCreated: 18, daysAgoStageChange: 4 },
  { borrower_name: "Front Range Industrial Co", contact_name: "Nate Ford", contact_email: "nate@frontrangeindustrial.com", contact_phone: "303-555-0155", property_address: "5600 Brighton Blvd", city: "Denver", state: "CO", asset_class: "Industrial", loan_type: "Bridge", loan_amount: 7100000, purchase_price: 9800000, equity_contribution: 3100000, interest_rate: 9.0, term_months: 18, exit_strategy: "Permanent Takeout", sponsor_names: ["Nate Ford"], use_of_proceeds: [{ category: "Renovation", amount: 800000 }], stage: "Escrow", source: "Broker Referral", assigned_to: "M. Alvarez", daysAgoCreated: 33, daysAgoStageChange: 8 },
  { borrower_name: "Gulf Coast Mixed-Use Partners", contact_name: "Angela Price", contact_email: "angela@gulfcoastmu.com", contact_phone: "813-555-0198", property_address: "101 Water St", city: "Tampa", state: "FL", asset_class: "Mixed-Use", loan_type: "Construction", loan_amount: 21500000, purchase_price: 8000000, equity_contribution: 7500000, interest_rate: null, term_months: 36, exit_strategy: "Permanent Takeout", sponsor_names: ["Angela Price", "Miguel Torres"], use_of_proceeds: [{ category: "Construction", amount: 17000000 }, { category: "Interest Reserve", amount: 2000000 }], stage: "Escrow", source: "Repeat Client", assigned_to: "T. Osei", daysAgoCreated: 41, daysAgoStageChange: 10 },
  { borrower_name: "Piedmont Office Holdings", contact_name: "Sam Whitfield", contact_email: "sam@piedmontoffice.com", contact_phone: "704-555-0121", property_address: "550 S Tryon St", city: "Charlotte", state: "NC", asset_class: "Office", loan_type: "Acquisition", loan_amount: 5400000, purchase_price: 7800000, equity_contribution: 2600000, interest_rate: 6.5, term_months: 60, exit_strategy: "Refinance", sponsor_names: ["Sam Whitfield"], use_of_proceeds: [], stage: "Financed", source: "Broker Referral", assigned_to: "J. Nguyen", daysAgoCreated: 60, daysAgoStageChange: 12 },
  { borrower_name: "Rocky Mountain SFR Fund", contact_name: "Lauren Diaz", contact_email: "lauren@rmsfrfund.com", contact_phone: "801-555-0113", property_address: "2100 S State St", city: "Salt Lake City", state: "UT", asset_class: "Single-Family / SFR", loan_type: "Bridge", loan_amount: 3600000, purchase_price: 4900000, equity_contribution: 1400000, interest_rate: 8.75, term_months: 18, exit_strategy: "Sale / Disposition", sponsor_names: ["Lauren Diaz"], use_of_proceeds: [{ category: "Renovation", amount: 350000 }], stage: "Financed", source: "Website", assigned_to: "M. Alvarez", daysAgoCreated: 75, daysAgoStageChange: 20 },
  { borrower_name: "Bayou Land Ventures", contact_name: "Chris Leduc", contact_email: "chris@bayouland.com", contact_phone: "225-555-0142", property_address: "Hwy 30 & River Rd", city: "Baton Rouge", state: "LA", asset_class: "Land", loan_type: "Acquisition", loan_amount: 2800000, purchase_price: 3500000, equity_contribution: 500000, interest_rate: 8.0, term_months: 12, exit_strategy: "Sale / Disposition", sponsor_names: ["Chris Leduc"], use_of_proceeds: [], stage: "Disqualified", lost_reason: "LTV exceeded program max; borrower unwilling to add recourse", source: "Website", assigned_to: "T. Osei", daysAgoCreated: 30, daysAgoStageChange: 25 },
  { borrower_name: "Great Lakes Retail Partners", contact_name: "Monica Reyes", contact_email: "monica@greatlakesretail.com", contact_phone: "312-555-0187", property_address: "900 N Michigan Ave", city: "Chicago", state: "IL", asset_class: "Retail", loan_type: "Bridge", loan_amount: 6700000, purchase_price: 9200000, equity_contribution: 3000000, interest_rate: 8.5, term_months: 18, exit_strategy: "Refinance", sponsor_names: ["Monica Reyes"], use_of_proceeds: [{ category: "Renovation", amount: 500000 }], stage: "Lost", lost_reason: "Borrower took a lower rate from a regional bank", source: "Broker Referral", assigned_to: "J. Nguyen", daysAgoCreated: 45, daysAgoStageChange: 15 },
  { borrower_name: "Copper State Construction Fund", contact_name: "Derek Ames", contact_email: "derek@copperstatecf.com", contact_phone: "480-555-0166", property_address: "3300 E Camelback Rd", city: "Scottsdale", state: "AZ", asset_class: "Hospitality", loan_type: "Construction", loan_amount: 18900000, purchase_price: 7000000, equity_contribution: 3000000, interest_rate: null, term_months: 30, exit_strategy: "Permanent Takeout", sponsor_names: ["Derek Ames", "Julie Ames"], use_of_proceeds: [{ category: "Construction", amount: 15000000 }, { category: "Interest Reserve", amount: 1800000 }], stage: "Disqualified", lost_reason: "Sponsor liquidity below required minimum", source: "Conference", assigned_to: "M. Alvarez", daysAgoCreated: 22, daysAgoStageChange: 17 },
  { borrower_name: "Blue Ridge Industrial Trust", contact_name: "Katie Sherman", contact_email: "katie@blueridgeindustrial.com", contact_phone: "865-555-0129", property_address: "1400 Middlebrook Pike", city: "Knoxville", state: "TN", asset_class: "Industrial", loan_type: "Acquisition", loan_amount: 5900000, purchase_price: 8200000, equity_contribution: 2500000, interest_rate: 7.1, term_months: 24, exit_strategy: "Refinance", sponsor_names: ["Katie Sherman"], use_of_proceeds: [], stage: "Intake", source: "Repeat Client", assigned_to: "J. Nguyen", daysAgoCreated: 0, daysAgoStageChange: 0 },
  { borrower_name: "Emerald Coast Multifamily", contact_name: "Brett Coleman", contact_email: "brett@emeraldcoastmf.com", contact_phone: "850-555-0154", property_address: "500 Beach Dr SE", city: "Panama City", state: "FL", asset_class: "Multifamily", loan_type: "Bridge", loan_amount: 10400000, purchase_price: 14000000, equity_contribution: 4100000, interest_rate: 9.25, term_months: 18, exit_strategy: "Permanent Takeout", sponsor_names: ["Brett Coleman", "Alicia Moore"], use_of_proceeds: [{ category: "Renovation", amount: 1500000 }, { category: "Interest Reserve", amount: 300000 }], stage: "Qualified", source: "Website", assigned_to: "T. Osei", daysAgoCreated: 6, daysAgoStageChange: 2 },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function main() {
  const existing = await db.collection("leads").get();
  for (const doc of existing.docs) {
    await deleteLeadCascade(doc.id);
  }

  for (const l of seedLeads) {
    const id = nanoid();
    const createdAt = daysAgo(l.daysAgoCreated);
    const stageChangedAt = daysAgo(l.daysAgoStageChange);
    const isClosed = l.stage === "Disqualified" || l.stage === "Lost";

    const lead = {
      borrower_name: l.borrower_name,
      contact_name: l.contact_name,
      contact_email: l.contact_email,
      contact_phone: l.contact_phone,
      property_address: l.property_address,
      city: l.city,
      state: l.state,
      asset_class: l.asset_class,
      loan_type: l.loan_type,
      loan_amount: l.loan_amount,
      purchase_price: l.purchase_price,
      equity_contribution: l.equity_contribution,
      interest_rate: l.interest_rate,
      term_months: l.term_months,
      exit_strategy: l.exit_strategy,
      sponsor_names: l.sponsor_names,
      use_of_proceeds: l.use_of_proceeds,
      latitude: null,
      longitude: null,
      exec_summary_filename: null,
      exec_summary_highlights: [],
      exec_summary_uploaded_at: null,
      stage: l.stage,
      prior_stage: isClosed ? "Qualified" : null,
      lost_reason: l.lost_reason ?? null,
      source: l.source,
      assigned_to: l.assigned_to,
      expected_close_date: null,
      notes: null,
      created_at: createdAt,
      updated_at: stageChangedAt,
      stage_changed_at: stageChangedAt,
    };

    await db.collection("leads").doc(id).set(lead);
    await db.collection("leads").doc(id).collection("stageHistory").doc(nanoid()).set({
      from_stage: null,
      to_stage: l.stage,
      reason: l.lost_reason ?? null,
      created_at: stageChangedAt,
    });
  }

  console.log(`Seeded ${seedLeads.length} leads.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
