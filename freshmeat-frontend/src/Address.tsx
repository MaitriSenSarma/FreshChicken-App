import { useMemo, useState } from "react";

import {

  ArrowLeft,

  CheckCircle2,

  ChevronDown,

  MapPin,

  Plus,

  ShieldCheck,

  Truck,

} from "lucide-react";

import "./Address.css";

type AddressProps = {

  onBack?: () => void;

  onContinue?: (details: DeliveryDetails) => void;

};

export type DeliveryDetails = {

  fullName: string;

  phone: string;

  apartment: string;

  flatNumber: string;

  floor: string;

  landmark: string;

};

const SAMPLE_APARTMENTS = [

  "Green View Apartments",

  "Sunrise Residency",

  "Lake Gardens Housing",

  "Royal Heights",

  "Orchid Enclave",

];

const EMPTY_DETAILS: DeliveryDetails = {

  fullName: "",

  phone: "",

  apartment: "",

  flatNumber: "",

  floor: "",

  landmark: "",

};

export default function Address({ onBack, onContinue }: AddressProps) {

  const [details, setDetails] = useState<DeliveryDetails>(EMPTY_DETAILS);

  const [savedAddresses, setSavedAddresses] = useState<DeliveryDetails[]>([]);

  const [selectedSaved, setSelectedSaved] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const approvedApartment = useMemo(

    () => SAMPLE_APARTMENTS.includes(details.apartment),

    [details.apartment]

  );

  function update<K extends keyof DeliveryDetails>(

    key: K,

    value: DeliveryDetails[K]

  ) {

    setDetails((current) => ({ ...current, [key]: value }));

    setError("");

    setSuccess("");

  }

  function chooseSavedAddress(index: number) {

    setSelectedSaved(index);

    setDetails(savedAddresses[index]);

    setShowForm(false);

    setError("");

    setSuccess("");

  }

  function saveAndContinue() {

    setError("");

    setSuccess("");

    if (!details.fullName.trim()) {

      setError("Please enter your full name.");

      return;

    }

    if (!/^[6-9]\d{9}$/.test(details.phone.trim())) {

      setError("Enter a valid 10-digit Indian mobile number.");

      return;

    }

    if (!details.apartment) {

      setError("Please select an apartment.");

      return;

    }

    if (!approvedApartment) {

      setError("Sorry, delivery is not available in your apartment yet.");

      return;

    }

    if (!details.flatNumber.trim()) {

      setError("Please enter your flat or house number.");

      return;

    }

const existingIndex = savedAddresses.findIndex(

  (address) =>

    address.phone === details.phone &&

    address.apartment === details.apartment &&

    address.flatNumber === details.flatNumber

);

if (existingIndex === -1) {

  const updatedAddresses = [...savedAddresses, details];

  setSavedAddresses(updatedAddresses);

  setSelectedSaved(updatedAddresses.length - 1);

} else {

  setSelectedSaved(existingIndex);

}

setSuccess("Delivery address selected successfully.");

window.localStorage.setItem("freshmeat-delivery-address", JSON.stringify(details));

onContinue?.(details);
  }

  return (

    <main className="address-page">

      <header className="address-header">

        <button

          className="address-back"

          onClick={onBack ?? (() => window.history.back())}

          aria-label="Go back"

        >

          <ArrowLeft size={19} />

        </button>

        <a className="address-brand" href="/" aria-label="FreshMeat home">

          <span className="address-brand-mark">F</span>

          <span>Fresh<span>Meat</span></span>

        </a>

        <div className="address-header-label">

          <ShieldCheck size={17} />

          <span>Secure checkout</span>

        </div>

      </header>

      <section className="address-hero">

        <div>

          <span className="address-eyebrow">ALMOST THERE</span>

          <h1>Where should we <span>deliver?</span></h1>

          <p>Select an approved apartment and add your delivery details.</p>

        </div>

        <div className="address-hero-icon"><MapPin size={50} /></div>

      </section>

      <div className="address-layout">

        <section className="address-main-card">

          <div className="address-section-title">

            <span className="address-step">1</span>

            <div>

              <h2>Delivery address</h2>

              <p>Choose where you want your order delivered.</p>

            </div>

          </div>

          {savedAddresses.length > 0 && (

            <div className="saved-addresses">

              <h3>Saved addresses</h3>

              {savedAddresses.map((address, index) => (

                <button

                  type="button"

                  key={`${address.phone}-${address.apartment}-${address.flatNumber}`}

                  className={`saved-address-option ${selectedSaved === index ? "selected" : ""}`}

                  onClick={() => chooseSavedAddress(index)}

                >

                  <span className="saved-address-radio">

                    {selectedSaved === index && <span />}

                  </span>

                  <span className="saved-address-copy">

                    <strong>{address.apartment}</strong>

                    <small>

                      {address.flatNumber}{address.floor ? `, ${address.floor}` : ""}

                      {address.landmark ? ` · ${address.landmark}` : ""}

                    </small>

                  </span>

                  <span className="saved-address-name">{address.fullName}</span>

                </button>

              ))}

              <button

                type="button"

                className="address-add-new"

                onClick={() => {

                  setDetails(EMPTY_DETAILS);

                  setSelectedSaved(null);

                  setShowForm(true);

                  setError("");

                  setSuccess("");

                }}

              >

                <Plus size={17} /> Add a new address

              </button>

            </div>

          )}

          {showForm && (

            <div className="address-form">

              <div className="address-field">

                <label htmlFor="delivery-name">Full name *</label>

                <input

                  id="delivery-name"

                  value={details.fullName}

                  onChange={(e) => update("fullName", e.target.value)}

                  placeholder="Enter recipient's full name"

                  autoComplete="name"

                />

              </div>

              <div className="address-field">

                <label htmlFor="delivery-phone">Mobile number *</label>

                <div className="address-phone-input">

                  <span>+91</span>

                  <input

                    id="delivery-phone"

                    inputMode="numeric"

                    maxLength={10}

                    value={details.phone}

                    onChange={(e) =>

                      update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))

                    }

                    placeholder="10-digit mobile number"

                    autoComplete="tel-national"

                  />

                </div>

              </div>

              <div className="address-field">

                <label htmlFor="delivery-apartment">Apartment / society *</label>

                <div className="address-select-wrap">

                  <select

                    id="delivery-apartment"

                    value={details.apartment}

                    onChange={(e) => update("apartment", e.target.value)}

                  >

                    <option value="">Select your apartment</option>

                    {SAMPLE_APARTMENTS.map((apartment) => (

                      <option key={apartment} value={apartment}>{apartment}</option>

                    ))}

                    <option value="__other__">Other / not listed</option>

                  </select>

                  <ChevronDown size={17} />

                </div>

                {details.apartment === "__other__" && (

                  <p className="address-hint">

                    Sorry, delivery is not available in your apartment yet.

                  </p>

                )}

                <p className="address-hint">

                  Sample apartment names only. Replace these with the client's approved list.

                </p>

              </div>

              <div className="address-form-row">

                <div className="address-field">

                  <label htmlFor="delivery-flat">Flat / house number *</label>

                  <input

                    id="delivery-flat"

                    value={details.flatNumber}

                    onChange={(e) => update("flatNumber", e.target.value)}

                    placeholder="e.g. Flat 4B"

                    autoComplete="address-line1"

                  />

                </div>

                <div className="address-field">

                  <label htmlFor="delivery-floor">Floor (optional)</label>

                  <input

                    id="delivery-floor"

                    value={details.floor}

                    onChange={(e) => update("floor", e.target.value)}

                    placeholder="e.g. 3rd floor"

                  />

                </div>

              </div>

              <div className="address-field">

                <label htmlFor="delivery-landmark">Landmark (optional)</label>

                <input

                  id="delivery-landmark"

                  value={details.landmark}

                  onChange={(e) => update("landmark", e.target.value)}

                  placeholder="Nearby landmark"

                  autoComplete="address-line2"

                />

              </div>

            </div>

          )}

          {error && (

            <div className="address-alert address-alert-error" role="alert">

              {error}

            </div>

          )}

          {success && (

            <div className="address-alert address-alert-success" role="status">

              <CheckCircle2 size={18} /> {success}

            </div>

          )}

          {!showForm && selectedSaved !== null && (

            <div className="selected-address-summary">

              <MapPin size={20} />

              <div>

                <strong>{details.apartment}</strong>

                <p>{details.flatNumber}{details.floor ? `, ${details.floor}` : ""}</p>

                <small>{details.fullName} · +91 {details.phone}</small>

              </div>

              <button onClick={() => setShowForm(true)}>Edit</button>

            </div>

          )}

          <button className="address-continue" onClick={saveAndContinue}>

            Continue to checkout <span>→</span>

          </button>

          <p className="address-disclaimer">

            This demo uses sample apartment names and stores saved addresses only in page memory.

            The approved list must also be validated by the backend before launch.

          </p>

        </section>

        <aside className="address-side-card">

          <div className="address-side-icon"><Truck size={24} /></div>

          <h2>Delivery availability</h2>

          <p>We currently deliver only to selected apartments.</p>

          <div className="address-side-divider" />

          <div className="address-side-row">

            <CheckCircle2 size={17} />

            <span>Choose an approved apartment</span>

          </div>

          <div className="address-side-row">

            <CheckCircle2 size={17} />

            <span>Enter a valid contact number</span>

          </div>

          <div className="address-side-row">

            <CheckCircle2 size={17} />

            <span>Confirm your flat details</span>

          </div>

          <div className="address-demo-note">

            <strong>Demo note</strong>

            <span>These apartment names are placeholders. Update them after your client confirms the delivery locations.</span>

          </div>

        </aside>

      </div>

      <footer className="address-footer">

        <a className="address-brand" href="/">

          <span className="address-brand-mark">F</span>

          <span>Fresh<span>Meat</span></span>

        </a>

        <span>© {new Date().getFullYear()} FreshMeat</span>

      </footer>

    </main>

  );

}
