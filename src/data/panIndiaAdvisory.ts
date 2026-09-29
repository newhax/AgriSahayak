// Pan-India Multi-Zone Agro-Climatic and Multi-Lingual Fallback Advisory Engine

export interface FallbackAdvisoryResult {
  language: string;
  crops: Array<{
    cropName: string;
    rationale: string;
    expectedYield: string;
    sowingWindow: string;
  }>;
  regenerativePractices: string[];
  riskMitigation: string;
  audioTranscript: string;
}

export function getLocalizedFallbackAdvisory(
  language: string,
  state: string,
  district: string,
  soilType: string,
  ph: number,
  organicCarbon: number,
  moistureValue: number,
  season: string,
  agroClimaticZone = "General"
): FallbackAdvisoryResult {
  const isRabi = season.includes("Rabi") || season.includes("Winter");
  const sLower = (state || "").toLowerCase().trim();
  const zLower = (agroClimaticZone || "").toLowerCase().trim();

  // Zone classifications
  const isCoastalSouth =
    sLower.includes("kerala") ||
    sLower.includes("tamil nadu") ||
    sLower.includes("goa") ||
    sLower.includes("puducherry") ||
    sLower.includes("andaman") ||
    sLower.includes("lakshadweep") ||
    zLower.includes("west coast") ||
    zLower.includes("island") ||
    zLower.includes("east coast");

  const isArid =
    sLower.includes("rajasthan") ||
    sLower.includes("gujarat") ||
    zLower.includes("western dry") ||
    zLower.includes("arid");

  const isNortheast =
    sLower.includes("assam") ||
    sLower.includes("meghalaya") ||
    sLower.includes("tripura") ||
    sLower.includes("arunachal") ||
    sLower.includes("nagaland") ||
    sLower.includes("manipur") ||
    sLower.includes("mizoram") ||
    zLower.includes("brahmaputra") ||
    zLower.includes("eastern himalayan");

  const isHillHimalayan =
    !isNortheast &&
    (sLower.includes("himachal") ||
      sLower.includes("jammu") ||
      sLower.includes("kashmir") ||
      sLower.includes("ladakh") ||
      sLower.includes("uttarakhand") ||
      sLower.includes("sikkim") ||
      zLower.includes("himalayan") ||
      zLower.includes("western himalayan"));

  const isPlateau =
    sLower.includes("maharashtra") ||
    sLower.includes("madhya pradesh") ||
    sLower.includes("telangana") ||
    sLower.includes("andhra") ||
    sLower.includes("karnataka") ||
    sLower.includes("chhattisgarh") ||
    zLower.includes("plateau");

  // Determine regionally authentic crops
  let crops: Array<{ cropName: string; rationale: string; expectedYield: string; sowingWindow: string }> = [];
  let regen: string[] = [];
  let risk = "";
  let transcript = "";

  if (isCoastalSouth) {
    if (language === "ml") {
      crops = [
        {
          cropName: "കുരുമുളക് (പന്നിയൂർ-1)",
          rationale: `${district} ജില്ലയിലെ ${soilType} മണ്ണും pH ${ph} ഉം കുരുമുളക് കൃഷിക്ക് ഏറ്റവും അനുയോജ്യമാണ്.`,
          expectedYield: "8-12 ക്വിന്റൽ / ഹെക്ടർ",
          sowingWindow: "മെയ് - ജൂൺ (കാലവർഷാരംഭം)"
        },
        {
          cropName: "ഏലം (ഐസിആർഐ-1)",
          rationale: `മണ്ണിലെ ഉയർന്ന ജൈവ കാർബണും (${organicCarbon}%) ഈർപ്പവും (${moistureValue}%) ഉൽപ്പാദനം വർദ്ധിപ്പിക്കുന്നു.`,
          expectedYield: "250-300 കിലോഗ്രാം / ഹെക്ടർ",
          sowingWindow: "ജൂൺ - ജൂലൈ"
        },
        {
          cropName: "നെല്ല് (ഉമ / ജ്യോതി)",
          rationale: `തീരദേശ എക്കൽ മണ്ണിൽ മികച്ച വിളവ് നൽകുന്ന പ്രതിരോധ ശേഷിയുള്ള നെല്ലിനം.`,
          expectedYield: "20-25 ക്വിന്റൽ / ഏക്കർ",
          sowingWindow: "ഒക്ടോബർ - നവംബർ (മുണ്ടകൻ)"
        }
      ];
      regen = [
        "മണ്ണിന്റെ ഈർപ്പം സംരക്ഷിക്കാൻ തെങ്ങിൻ തടങ്ങളിൽ ചകിരിയും ഇലകളും കൊണ്ട് പുതയിടുക.",
        "ജീവാമൃതവും ട്രൈക്കോഡെർമയും ഉപയോഗിച്ച് വേരുചീയൽ രോഗം തടയുക.",
        "ചെരിഞ്ഞ ഭൂമിയിൽ മഴവെള്ള സംഭരണത്തിനായി തട്ടുകളാക്കി കൃഷി ചെയ്യുക."
      ];
      risk = "അതിശക്തമായ കാലവർഷത്തിലും വേനൽ മഴയിലും മണ്ണൊലിപ്പ് തടയാൻ ഡ്രെയിനേജുകൾ വൃത്തിയാക്കുക.";
      transcript = `നമസ്കാരം കർഷക മിത്രമേ! ${district} ജില്ലയ്ക്കായുള്ള കാർഷിക നിർദ്ദേശം: നിങ്ങളുടെ ${soilType} മണ്ണിന് കുരുമുളകും നെല്ലും ഏലവുമാണ് ഏറ്റവും അനുയോജ്യം. ജൈവ വളങ്ങൾ ഉപയോഗിച്ച് കൃഷി ചെയ്യുക.`;
    } else if (language === "ta") {
      crops = [
        {
          cropName: "நெல் (ஏடிடீ 45 / கோ 51)",
          rationale: `${district} மாவட்டத்தின் ${soilType} மண் மற்றும் pH ${ph} நெல் பயிரிட உகந்தது.`,
          expectedYield: "24-28 குவிண்டால் / ஏக்கர்",
          sowingWindow: "அக்டோபர் - நவம்பர் (சம்பா)"
        },
        {
          cropName: "வாழை (ஜி9 / நேந்திரன்)",
          rationale: `மண்ணின் ஈரப்பதம் (${moistureValue}%) மற்றும் ஊட்டச்சத்து அளவு வாழைக்கு அதிக லாபம் தரும்.`,
          expectedYield: "35-40 டன் / ஏக்கர்",
          sowingWindow: "பிப்ரவரி - மார்ச்"
        },
        {
          cropName: "நிலக்கடலை (விஆர்ஐ 8)",
          rationale: `குறைந்த நீர்த்தேவை மற்றும் வளிமண்டல நைட்ரஜனை நிலைநிறுத்தி மண் வளத்தை பெருக்கும்.`,
          expectedYield: "12-14 குவிண்டால் / ஏக்கர்",
          sowingWindow: "டிசம்பர் - ஜனவரி"
        }
      ];
      regen = [
        "பயிர் கழிவுகளை எரிக்காமல் நிலத்திலேயே மூடாக்காக இடுங்கள்.",
        "சூடோமோனாஸ் மற்றும் ட்ரைக்கோடெர்மா மூலம் விதை நேர்த்தி செய்யுங்கள்.",
        "பசுந்தாள் உரங்களான தக்கைப்பூண்டு பயிரிட்டு மண்ணில் மடக்கி உழுங்கள்."
      ];
      risk = "பருவமழை மாற்றங்களால் ஏற்படும் நீர் தேக்கத்தைத் தவிர்க்க வடிகால் வசதிகளை சீரமைக்கவும்.";
      transcript = `வணக்கம் விவசாய பெருமக்களே! ${district} மாவட்டத்திற்கான வேளாண் ஆலோசனை: உங்கள் மண்ணின் தன்மைக்கு நெல் மற்றும் நிலக்கடலை சாகுபடி சிறந்தது. இயற்கை உரங்களைப் பயன்படுத்துங்கள்.`;
    } else {
      crops = [
        {
          cropName: "Black Pepper (Panniyur-1)",
          rationale: `Well-suited for ${district}'s ${soilType} with pH ${ph} and high organic carbon (${organicCarbon}%).`,
          expectedYield: "8-12 quintals/hectare",
          sowingWindow: "May - June (Pre-Monsoon)"
        },
        {
          cropName: "Cardamom (ICRI-1) / Coconut",
          rationale: `Ideal for humid agro-climatic conditions with ${moistureValue}% soil moisture.`,
          expectedYield: "High market value commercial yield",
          sowingWindow: "June - July"
        },
        {
          cropName: "Wetland Rice (Uma / Jyothi)",
          rationale: `Thrives in tropical coastal lowlands with balanced irrigation.`,
          expectedYield: "22-25 quintals/acre",
          sowingWindow: "October - November"
        }
      ];
      regen = [
        "Apply organic coir pith and green leaf mulching to conserve moisture in tree basins.",
        "Inoculate root zones with Trichoderma and VAM bio-fertilizer to prevent foot rot.",
        "Adopt contour bunding on sloping plantation terrains to prevent soil erosion."
      ];
      risk = "Ensure clear drainage channels before peak monsoon to prevent water stagnation and root wilt.";
      transcript = `Welcome, farmer friend! Agricultural advisory for ${district}: based on your ${soilType} with pH ${ph}, Black Pepper, Cardamom, and Wetland Rice are highly recommended. Implement residue mulching and bio-control to protect root health.`;
    }
  } else if (isArid) {
    if (language === "gu") {
      crops = [
        {
          cropName: "કપાસ (જી.કોટ-૨૩ / બીટી)",
          rationale: `${district} જિલ્લાની ${soilType} જમીન અને pH ${ph} કપાસના પાક માટે અનુકૂળ છે.`,
          expectedYield: "૧૮-૨૨ ક્વિન્ટલ / એકર",
          sowingWindow: "મે આખર થી જૂન"
        },
        {
          cropName: "જીરું (ગુજરાત જીરું-૪)",
          rationale: `ઓછા પાણીમાં અને શિયાળાની અનુકૂળ ઋતુમાં સૌથી વધુ આર્થિક નફો આપતો પાક.`,
          expectedYield: "૫-૭ ક્વિન્ટલ / એકર",
          sowingWindow: "નવેમ્બર પ્રથમ પખવાડિયું"
        },
        {
          cropName: "મગફળી (જીજેજી-૩૨)",
          rationale: `જમીનની ફળદ્રુપતા વધારે છે અને સૂકા વાતાવરણમાં સારો ઉતારો આપે છે.`,
          expectedYield: "૧૨-૧૪ ક્વિન્ટલ / એકર",
          sowingWindow: "જૂન થી જુલાઈ"
        }
      ];
      regen = [
        "ટપક સિંચાઈ પદ્ધતિ અપનાવી પાણીની ૪૦% બચત કરો.",
        "બીજને ટ્રાઇકોડર્મા પાવડરથી પટ આપી વાવણી કરો.",
        "દેશી ગાયના ગોબર-ગૌમૂત્રમાંથી બનાવેલ જીવામૃતનો ઉપયોગ કરો."
      ];
      risk = "ગરમી અને ઓછા વરસાદની પરિસ્થિતિમાં ભેજ જાળવવા પરાળનું મલ્ચિંગ કરો.";
      transcript = `નમસ્કાર ખેડૂત મિત્રો! ${district} માટે કૃષિ સલાહ: ઓછી ભેજવાળી ${soilType} જમીન માટે કપાસ, મગફળી અને રવિમાં જીરું સર્વોત્તમ પસંદગી છે. ટપક પદ્ધતિથી સિંચાઈ કરો.`;
    } else {
      crops = [
        {
          cropName: isRabi ? "सरसों (पूसा मस्टर्ड-25 / गिरिराज)" : "बाजरा (पूसा-1201 / आरएचबी-177)",
          rationale: `${district} की शुष्क ${soilType} मिट्टी (pH ${ph}) और कम पानी की आवश्यकता के लिए यह प्रमाणित सूखा-सहिष्णु किस्म है।`,
          expectedYield: isRabi ? "10-12 क्विंटल / एकड़" : "14-16 क्विंटल / एकड़",
          sowingWindow: isRabi ? "1 अक्टूबर से 20 अक्टूबर" : "15 जून से 10 जुलाई"
        },
        {
          cropName: isRabi ? "जीरा (आरजेड-209 / 223)" : "ग्वार (आरजीसी-1038 / 936)",
          rationale: `कम नमी (${moistureValue}%) में अत्यधिक मूल्यवान नकदी फसल। यह मिट्टी में नाइट्रोजन भी स्थिर करती है।`,
          expectedYield: isRabi ? "4-5 क्विंटल / एकड़" : "8-10 क्विंटल / एकड़",
          sowingWindow: isRabi ? "10 नवंबर से 25 नवंबर" : "जुलाई प्रथम पखवाड़ा"
        },
        {
          cropName: "चना / मोठ (पूसा-372 / आरएमओ-40)",
          rationale: `रेतीली दोमट मिट्टी में न्यूनतम लागत और कम जल स्तर में बेहतर उपज।`,
          expectedYield: "6-8 क्विंटल / एकड़",
          sowingWindow: "अक्टूबर के मध्य"
        }
      ];
      regen = [
        "ड्रिप अथवा फव्वारा सिंचाई प्रणाली अपनाकर 45% तक पानी बचाएं।",
        "खेत में नमी संरक्षण के लिए फसल अवशेषों से मल्चिंग करें।",
        "ट्राइकोडर्मा और राइजोबियम कल्चर से बीज शोधन अवश्य करें।"
      ];
      risk = "अचानक तापमान वृद्धि अथवा पश्चिमी विक्षोभ से बचाव के लिए हल्की सिंचाई समय पर सुनिश्चित करें।";
      transcript = `नमस्कार किसान भाइयों! ${district} जिले के लिए कृषि सलाह: आपकी शुष्क जलवायु और ${soilType} के लिए बाजरा, सरसों और जीरा सबसे लाभदायक फसलें हैं। ड्रिप सिंचाई और बीज शोधन अपनाकर उत्पादन बढ़ाएं।`;
    }
  } else if (isHillHimalayan) {
    crops = [
      {
        cropName: "सेब / बागवानी (रॉयल डेलिशियस / गाला)",
        rationale: `${district} की पहाड़ी मिट्टी, ठंडी जलवायु और जैविक कार्बन (${organicCarbon}%) उच्च गुणवत्ता वाले सेब और शीतोष्ण फलों के लिए सर्वोत्तम है।`,
        expectedYield: "12-15 टन / हेक्टेयर",
        sowingWindow: "दिसंबर से फरवरी (रोपण)"
      },
      {
        cropName: isRabi ? "जौ (हिमालयन-120) / गेहूँ" : "मक्का (पूसा संकर मक्का-5)",
        rationale: `पहाड़ी ढलानों और pH ${ph} पर कम पानी में मजबूत दाना भराव।`,
        expectedYield: "18-20 क्विंटल / एकड़",
        sowingWindow: isRabi ? "अक्टूबर - नवंबर" : "अप्रैल - मई"
      },
      {
        cropName: "राजमा / अदरक (जोशीमठ / सुदर्शन)",
        rationale: `पहाड़ी जैविक परिस्थितियों में अत्यधिक प्रीमियम बाजार मूल्य और नाइट्रोजन स्थिरीकरण।`,
        expectedYield: "8-10 क्विंटल / एकड़",
        sowingWindow: "मई प्रथम सप्ताह"
      }
    ];
    regen = [
      "ढलान वाले खेतों पर समोच्च (कंटूर) मेड़बन्दी करें जिससे मृदा क्षरण रुके।",
      "सड़े गोबर की कम्पोस्ट और वर्मीवाश का पर्णीय छिड़काव करें।",
      "सर्दियों में पाले (Frost) से बचाव हेतु थालों में घास की मल्चिंग करें।"
    ];
    risk = "ओलावृष्टि और पाले से बचाव के लिए फलों के बागों पर एंटी-हेल नेट स्थापित करें।";
    transcript = `नमस्कार किसान भाइयों! ${district} के पहाड़ी क्षेत्र के लिए कृषि सलाह: आपके क्षेत्र के लिए सेब, मक्का और राजमा सर्वोत्तम फसलें हैं। ढलानों पर कंटूर फार्मिंग और पाले से सुरक्षा के उपाय अवश्य करें।`;
  } else if (isNortheast) {
    if (language === "as") {
      crops = [
        {
          cropName: "চাহ খেতি (টিভি-১ / ক্লোনাল)",
          rationale: `${district} জিলাৰ অম্লীয় ${soilType} মাটি আৰু উচ্চ জৈৱ কাৰ্বন চাহৰ গুণমানৰ বাবে উৎকৃষ্ট।`,
          expectedYield: "১২-১৫ কুইণ্টল তৈয়াৰী চাহ / হেক্টৰ",
          sowingWindow: "এপ্ৰিল - মে'"
        },
        {
          cropName: "জহা / শালি ধান (ৰঞ্জিত / বাহাদুৰ)",
          rationale: `প্ৰচুৰ বৰষুণ আৰু ${moistureValue}% আৰ্দ্ৰতাৰ সৈতে সুগন্ধি জহা ধানৰ উৎপাদন অতি লাভজনক।`,
          expectedYield: "২০-২২ কুইণ্টল / একৰ",
          sowingWindow: "জুন - জুলাই"
        },
        {
          cropName: "আদা আৰু হালধি (নাদিয়া / লাকাডং)",
          rationale: `উচ্চ কাৰ্কুমিন যুক্ত আৰু কম খৰচতে অধিক বজাৰ মূল্য প্ৰদানকাৰী মসলা শস্য।`,
          expectedYield: "৮০-১০০ কুইণ্টল / একৰ",
          sowingWindow: "মাৰ্চ - এপ্ৰিল"
        }
      ];
      regen = [
        "মাটিৰ উৰ্বৰতা বৃদ্ধিৰ বাবে সেউজীয়া সাৰ আৰু কেঁচুসাৰ প্ৰয়োগ কৰক।",
        "ট্ৰাইকোডাৰ্মাৰে বীজ শোধন কৰি শিপা পচা ৰোগ নিয়ন্ত্ৰণ কৰক।",
        "পানী জমা নহ'বলৈ পথাৰত নলাৰ উপযুক্ত ব্যৱস্থা ৰাখক।"
      ];
      risk = "বাৰিষাৰ প্ৰবল বানপানী আৰু আৰ্দ্ৰতাজনিত ভেঁকুৰ ৰোগৰ প্ৰতি সতৰ্ক থাকক।";
      transcript = `নমস্কাৰ কৃষক বন্ধুসকল! ${district} জিলাৰ বাবে কৃষি পৰামৰ্শ: আপোনাৰ অঞ্চলৰ অম্লীয় মাটিৰ বাবে চাহ, জহা ধান আৰু আদা খেতি অতি লাভজনক। জৈৱিক সাৰ প্ৰয়োগ কৰি উৎপাদন খৰচ কমাব পাৰি।`;
    } else {
      crops = [
        {
          cropName: "Tea (Clone TV-29) / Plantation",
          rationale: `Acidic ${soilType} (pH ${ph}) with high organic carbon (${organicCarbon}%) is ideal for premium quality tea and horticultural crops in ${district}.`,
          expectedYield: "12-15 quintals made tea/hectare",
          sowingWindow: "Spring planting (April - May)"
        },
        {
          cropName: "Aromatic Rice (Joha / Ranjit)",
          rationale: `Thrives in Brahmaputra valley soil with rich natural water retention.`,
          expectedYield: "20-24 quintals/acre",
          sowingWindow: "June - July"
        },
        {
          cropName: "Ginger (Nadia) & Turmeric (Lakadong)",
          rationale: `High curcumin spice crop with strong national and export market demand.`,
          expectedYield: "80-100 quintals fresh/acre",
          sowingWindow: "March - April"
        }
      ];
      regen = [
        "Apply vermicompost and Azospirillum bio-fertilizers to nurture acidic soil balance.",
        "Treat seed rhizomes with Trichoderma to guard against Pythium soft rot.",
        "Ensure raised bed planting with perimeter drainage ditches against monsoon flooding."
      ];
      risk = "Construct field drainage to prevent waterlogging during peak monsoon surges.";
      transcript = `Welcome, farmer friend! Advisory for ${district}: based on your ${soilType} with pH ${ph}, Tea, Joha Rice, and Turmeric are strongly recommended. Adopt raised beds and bio-fungicides for optimal yield.`;
    }
  } else if (isPlateau) {
    if (language === "mr") {
      crops = [
        {
          cropName: "कापूस (अजित-१५५ / बीटी)",
          rationale: `${district} मधील काळी कसदार ${soilType} जमीन आणि pH ${ph} कापसाच्या जोमदार वाढीसाठी उत्कृष्ट आहे.`,
          expectedYield: "१२-१५ क्विंटल / एकर",
          sowingWindow: "१५ जून ते १० जुलै"
        },
        {
          cropName: "सोयाबीन (फुले संगम / जेएस-३३५)",
          rationale: `कमी खर्चात हमखास उत्पादन आणि जमिनीतील नत्र वाढवणारे कडधान्य पीक.`,
          expectedYield: "१०-१२ क्विंटल / एकर",
          sowingWindow: "२० जून ते १५ जुलै"
        },
        {
          cropName: isRabi ? "हरभरा (विजय / दिग्विजय)" : "कांदा (भीमा सुपर)",
          rationale: `रब्बी हंगामात कमी पाण्यावर भरघोस उत्पादन देणारे नगदी पीक.`,
          expectedYield: isRabi ? "१०-१२ क्विंटल / एकर" : "१००-१२० क्विंटल / एकर",
          sowingWindow: isRabi ? "ऑक्टोबर अखेर" : "जुलै - ऑगस्ट"
        }
      ];
      regen = [
        "बीजप्रक्रियेसाठी ट्रायकोडर्मा व रायझोबियमचा वापर करा.",
        "जमिनीत जिवामृत व गांडूळ खत घालून सेंद्रिय कर्ब वाढवा.",
        "पाण्याचा ताण पडल्यास आच्छादन (मल्चिंग) करून ओलावा टिकवा."
      ];
      risk = "पावसातील मोठा खंड किंवा अवकाळी पाऊस झाल्यास शेतात पाणी साचू न देणे व पोटॅशची फवारणी करणे.";
      transcript = `नमस्कार शेतकरी बंधूंनो! ${district} जिल्ह्यासाठी शेती सल्ला: आपल्या काळ्या कसदार जमिनीत कापूस, सोयाबीन आणि हरभरा ही पिके सर्वात फायदेशीर ठरतील. बीजप्रक्रिया करूनच पेरणी करा.`;
    } else if (language === "te") {
      crops = [
        {
          cropName: "పత్తి (మల్లిక / బీటీ)",
          rationale: `${district} లోని నల్లరేగడి నేలలు మరియు pH ${ph} పత్తికి అత్యంత అనుకూలం.`,
          expectedYield: "12-15 క్వింటాళ్లు / ఎకరం",
          sowingWindow: "జూన్ - జూలై"
        },
        {
          cropName: "వరి (ఎంటీయూ-1010 / బీపీటీ)",
          rationale: `నీటి వనరులు మరియు మట్టి సారం ఆధారంగా స్థిరమైన దిగుబడినిచ్చే రకం.`,
          expectedYield: "24-28 క్వింటాళ్లు / ఎకరం",
          sowingWindow: "ఖరీఫ్: జూలై, రబీ: నవంబర్"
        },
        {
          cropName: "మిరప (తేజ / ఎల్సీఏ)",
          rationale: `అధిక మార్కెట్ విలువ కలిగిన వాణిజ్య పంట.`,
          expectedYield: "20-25 క్వింటాళ్లు ఎండు మిర్చి / ఎకరం",
          sowingWindow: "ఆగస్టు - సెప్టెంబర్"
        }
      ];
      regen = [
        "పచ్చిరొట్ట ఎరువులైన జీలుగ లేదా జనుమును కలియదున్నండి.",
        "విత్తన శుద్ధి కోసం ట్రైకోడెర్మా విరిడే ఉపయోగించండి.",
        "బిందు సేద్యం (డ్రిప్) ద్వారా నీటిని ఆదా చేయండి."
      ];
      risk = "అకాల వర్షాలు మరియు తెగుళ్ల నివారణకు వేపనూనె పిచికారీ చేయండి.";
      transcript = `నమస్కారం రైతు సోదరులారా! ${district} జిల్లాకు వ్యవసాయ సలహా: మీ నేలకు పత్తి మరియు మిరప ఉత్తమ పంటలు. సమగ్ర సస్యరక్షణ పాటించి ఖర్చులు తగ్గించండి.`;
    } else {
      crops = [
        {
          cropName: "Cotton (Bt Hybrid) / Soybean",
          rationale: `Well-suited for ${district}'s black/medium ${soilType} with pH ${ph} and ${organicCarbon}% organic carbon.`,
          expectedYield: "12-15 quintals/acre",
          sowingWindow: "Late June to Mid-July"
        },
        {
          cropName: isRabi ? "Chickpea (Desi Gram - Digvijay)" : "Onion (Bhima Red)",
          rationale: `Thrives under lower winter irrigation while fixing residual soil nitrogen.`,
          expectedYield: isRabi ? "10-12 quintals/acre" : "100-120 quintals/acre",
          sowingWindow: isRabi ? "October - November" : "July"
        },
        {
          cropName: "Pigeonpea / Tur (BDN-711)",
          rationale: `Excellent intercrop with deep taproots that break hardpan soil layers.`,
          expectedYield: "8-10 quintals/acre",
          sowingWindow: "June onset"
        }
      ];
      regen = [
        "Treat seed stock with Rhizobium and Trichoderma before sowing.",
        "Adopt broad bed furrow (BBF) planting to manage heavy rainfall moisture.",
        "Apply neem-coated urea and green manuring (Sunhemp) to enrich soil fertility."
      ];
      risk = "Install active field runoff channels to prevent water stagnation in heavy clay/black soils.";
      transcript = `Welcome, farmer friend! Agricultural advisory for ${district}: based on your ${soilType} with pH ${ph}, Cotton, Soybean, and Chickpeas are strongly recommended. Implement BBF planting and bio-fertilizer seed treatments.`;
    }
  } else {
    // Indo-Gangetic Plains & Central North (Punjab, Haryana, UP, Bihar, WB)
    if (language === "pa") {
      crops = [
        {
          cropName: "ਕਣਕ (HD-3086 / PBW-824)",
          rationale: `${district} ਜ਼ਿਲ੍ਹੇ ਦੀ ${soilType} ਜ਼ਮੀਨ, pH ${ph} ਅਤੇ ਮਿੱਟੀ ਦੀ ਨਮੀ (${moistureValue}%) ਕਣਕ ਲਈ ਉੱਤਮ ਹੈ।`,
          expectedYield: "20-24 ਕੁਇੰਟਲ / ਏਕੜ",
          sowingWindow: "25 ਅਕਤੂਬਰ ਤੋਂ 15 ਨਵੰਬਰ"
        },
        {
          cropName: "ਸਰ੍ਹੋਂ (ਗਿਰੀਰਾਜ / ਪੀਬੀਐਸਐਚ-1965)",
          rationale: `ਘੱਟ ਪਾਣੀ ਵਿੱਚ ਵੱਧ ਮੁਨਾਫ਼ਾ ਦੇਣ ਵਾਲੀ ਤੇਲ ਬੀਜ ਫ਼ਸਲ।`,
          expectedYield: "10-12 ਕੁਇੰਟਲ / ਏਕੜ",
          sowingWindow: "ਅਕਤੂਬਰ ਦਾ ਪਹਿਲਾ ਪੰਦਰਵਾੜਾ"
        },
        {
          cropName: "ਛੋਲੇ (ਪੀਬੀਜੀ-7) / ਮੱਕੀ",
          rationale: `ਨਾਈਟ੍ਰੋਜਨ ਫ਼ਿਕਸ ਕਰਕੇ ਜ਼ਮੀਨ ਦੀ ਉਪਜਾਊ ਸ਼ਕਤੀ ਵਧਾਉਣ ਵਾਲੀ ਦਾਲ ਫ਼ਸਲ।`,
          expectedYield: "8-10 ਕੁਇੰਟਲ / ਏਕੜ",
          sowingWindow: "ਅਕਤੂਬਰ ਦੇ ਅਖੀਰ ਤੱਕ"
        }
      ];
      regen = [
        "ਕਣਕ ਦੀ ਬਿਜਾਈ ਹੈਪੀ ਸੀਡਰ ਜਾਂ ਸੁਪਰ ਸੀਡਰ ਨਾਲ ਕਰੋ ਤਾਂ ਜੋ ਪਰਾਲੀ ਖੇਤ ਵਿੱਚ ਹੀ ਗਲ਼ ਕੇ ਖਾਦ ਬਣੇ।",
        "ਬੀਜ ਨੂੰ ਬਿਜਾਈ ਤੋਂ ਪਹਿਲਾਂ ਰਾਈਜ਼ੋਬੀਅਮ ਜਾਂ ਉੱਲੀਨਾਸ਼ਕ ਨਾਲ ਸੋਧੋ।",
        "ਰਸਾਇਣਕ ਖਾਦਾਂ ਦੀ ਬਜਾਏ ਰੂੜੀ ਖਾਦ ਅਤੇ ਹਰੀ ਖਾਦ ਨੂੰ ਤਰਜੀਹ ਦਿਓ।"
      ];
      risk = "ਬੇਮੌਸਮੀ ਬਾਰਿਸ਼ ਅਤੇ ਤੇਜ਼ ਹਵਾਵਾਂ ਦੇ ਨੁਕਸਾਨ ਤੋਂ ਬਚਾਅ ਲਈ ਖੇਤ ਵਿੱਚ ਪਾਣੀ ਦੀ ਨਿਕਾਸੀ ਦਾ ਢੁਕਵਾਂ ਪ੍ਰਬੰਧ ਰੱਖੋ।";
      transcript = `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ ਵੀਰੋ! ਤੁਹਾਡੇ ਜ਼ਿਲ੍ਹੇ ${district} ਲਈ ਖੇਤੀਬਾੜੀ ਸਲਾਹ: ਮੌਜੂਦਾ ਮੌਸਮ ਅਤੇ ${ph} pH ਵਾਲੀ ਜ਼ਮੀਨ ਅਨੁਸਾਰ ਕਣਕ (HD-3086) ਅਤੇ ਸਰ੍ਹੋਂ ਸਭ ਤੋਂ ਵਧੀਆ ਫ਼ਸਲਾਂ ਹਨ। ਬਿਜਾਈ 25 ਅਕਤੂਬਰ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ।`;
    } else if (language === "bn") {
      crops = [
        {
          cropName: "আমন / বোরো ধান (স্বর্ণ সাব-১ / শতাব্দী)",
          rationale: `${district} জেলার উর্বর পলি ${soilType} মাটি এবং pH ${ph} ধান চাষের জন্য অত্যন্ত উপযোগী।`,
          expectedYield: "২২-২৬ কুইন্টাল / একর",
          sowingWindow: "জুলাই - আগস্ট (আমন), নভেম্বর - ডিসেম্বর (বোরো)"
        },
        {
          cropName: "সরিষা (বাইনয় সরিষা-৯ / পূসা বোল্ড)",
          rationale: `শীতকালীন স্বল্পমেয়াদী লাভজনক তেলবীজ ফসল।`,
          expectedYield: "১০-১২ কুইন্টাল / একর",
          sowingWindow: "অক্টোবর শেষ থেকে নভেম্বর প্রথম সপ্তাহ"
        },
        {
          cropName: "আলু (কুফরি জ্যোতি / পোখরাজ)",
          rationale: `উচ্চ জৈব কার্বন ও অনুকূল আর্দ্রতায় আলুর বাম্পার ফলন পাওয়া যায়।`,
          expectedYield: "১২০-১৪০ কুইন্টাল / একর",
          sowingWindow: "নভেম্বরের মাঝামাঝি"
        }
      ];
      regen = [
        "জৈব সার হিসেবে ট্রাইকো-কম্পোস্ট ও ভার্মিকম্পোস্ট ব্যবহার করুন।",
        "বীজ শোধনের মাধ্যমে কান্ড পচা ও ব্লাইট রোগ প্রতিরোধ করুন।",
        "পরিমিত সেচের জন্য এডব্লিউডি (AWD) পদ্ধতি অবলম্বন করুন।"
      ];
      risk = "অকাল বৃষ্টিতে আলুর গোড়ায় জল জমতে না দেওয়ার জন্য উপযুক্ত নিকাশি নালা তৈরি রাখুন।";
      transcript = `নমস্কার কৃষক ভাই! ${district} জেলার জন্য কৃষি পরামর্শ: আপনার ${soilType} মাটির জন্য ধান, সরিষা ও আলু অত্যন্ত লাভজনক। সুষম সার ও বীজ শোধন প্রয়োগ করুন।`;
    } else {
      crops = [
        {
          cropName: isRabi ? "गेहूँ (HD-3086 / पूसा गौतमी)" : "धान / बासमती (PB 1509)",
          rationale: `${district} की ${soilType} मिट्टी (pH ${ph}, नमी ${moistureValue}%) इस किस्म के लिए आदर्श है।`,
          expectedYield: isRabi ? "20-22 क्विंटल / एकड़" : "22-25 क्विंटल / एकड़",
          sowingWindow: isRabi ? "25 अक्टूबर से 15 नवंबर" : "15 जून से 10 जुलाई"
        },
        {
          cropName: isRabi ? "सरसों (पूसा मस्टर्ड-25)" : "मक्का (पूसा संकर मक्का-1)",
          rationale: `मिट्टी में जैविक कार्बन (${organicCarbon}%) के साथ कम लागत और उच्च आय देने वाली फसल।`,
          expectedYield: isRabi ? "10-12 क्विंटल / एकड़" : "24-28 क्विंटल / एकड़",
          sowingWindow: isRabi ? "अक्टूबर प्रथम पखवाड़ा" : "20 जून से 15 जुलाई"
        },
        {
          cropName: "देसी चना (पूसा-372) / मसूर",
          rationale: `दलहनी फसल जो मिट्टी में नाइट्रोजन स्थिर कर आगामी फसलों की उर्वरता बढ़ाती है।`,
          expectedYield: "8-10 क्विंटल / एकड़",
          sowingWindow: "अक्टूबर के अंत तक"
        }
      ];
      regen = [
        "हैप्पी सीडर या जीरो-टिल से बुवाई कर पराली को खेत में ही गलने दें।",
        "बीज को राइजोबियम व ट्राइकोडर्मा से शोधित करके ही बोएं।",
        "रासायनिक खादों की जगह गोबर की सड़ी खाद व हरी खाद को प्राथमिकता दें।"
      ];
      risk = "बेमौसम बारिश या तापमान में अचानक बदलाव से बचाव के लिए खेत में जल निकासी का उचित प्रबंध रखें।";
      transcript = `नमस्कार किसान भाइयों! ${district} जिले के लिए कृषि सलाह: आपकी ${soilType} मिट्टी और pH ${ph} के लिए ${isRabi ? "गेहूँ (HD-3086), सरसों और चना" : "धान और मक्का"} सबसे उपयुक्त फसलें हैं। समय पर बुवाई और जैविक खाद का उपयोग करें।`;
    }
  }

  return {
    language,
    crops,
    regenerativePractices: regen,
    riskMitigation: risk,
    audioTranscript: transcript,
  };
}
