import { PrismaClient } from "@prisma/client";
import { ethers } from "ethers";

const prisma = new PrismaClient();

function computeHash(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
}

async function main() {
  console.log("Seeding AlfaazVault catalogue listings...");

  // Clean out old demo/seed listings so we can re-seed cleanly
  const deleted = await prisma.listing.deleteMany({
    where: {
      OR: [
        { isDemo: true },
        { chainListingId: { lt: 0 } },
        { authorWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" },
      ],
    },
  });
  console.log(`Cleaned ${deleted.count} old seed listings.`);

  const catalogueAuthor = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

  await prisma.user.upsert({
    where: { walletAddress: catalogueAuthor },
    update: {},
    create: { walletAddress: catalogueAuthor },
  });

  // All catalogue pieces: NOT demo, purchasable, ultra-low price
  const PRICE = "0.000001";

  const cataloguePieces = [
    {
      title: "دیارِ عشق میں اپنا مقام پیدا کر",
      category: "Shayari",
      description: "علامہ اقبال کا ایک لازوال شاہکار کلام جو انسانی خودی، جدوجہد اور بلند حوصلگی کا درس دیتا ہے۔",
      chainListingId: 1,
      fullText: `دیارِ عشق میں اپنا مقام پیدا کر
نیا زمانہ، نئے صبح و شام پیدا کر

خدا اگر دلِ فطرت شناس دے تجھ کو
سکوتِ لالہ و گل سے کلام پیدا کر

اٹھا نہ شیشہ گرانِ فرنگ کے احسان
سفالِ ہند سے مینا و جام پیدا کر

میں شاخِ تاک ہوں، میری غزل ہے میرا ثمر
مرے ثمر سے مئے لالہ فام پیدا کر

مرا طریق امیری نہیں، فقیری ہے
خودی نہ بیچ، غریبی میں نام پیدا کر!`,
    },
    {
      title: "अग्निपथ - अनवरत संघर्ष की अमर गाथा",
      category: "Poetry",
      description: "हरिवंश राय बच्चन की कालजयी कविता, जो जीवन के कठिन पथ पर बिना थके और बिना झुके आगे बढ़ने की प्रेरणा देती है।",
      chainListingId: 2,
      fullText: `वृक्ष हों भले खड़े,
हों घने हों बड़े,
एक पत्र छांह भी,
मांग मत, मांग मत, मांग मत,
अग्निपथ! अग्निपथ! अग्निपथ!

तू न थकेगा कभी,
तू न थमेगा कभी,
तू न मुड़ेगा कभी,
कर शपथ! कर शपथ! कर शपथ!
अग्निपथ! अग्निपथ! अग्निपथ!

यह महान दृश्य है,
चल रहा मनुष्य है,
अश्रु श्वेद रक्त से,
लथपथ! लथपथ! लथपथ!
अग्निपथ! अग्निपथ! अग्निपथ!`,
    },
    {
      title: "The Clockmaker of Cordoba",
      category: "Story",
      description: "In an ancient alley in Andalusia, a master artisan constructs an intricate timepiece that measures forgotten memories rather than fleeing seconds.",
      chainListingId: 3,
      fullText: `The morning mist hung low over the terracotta roofs of Cordoba when Mateo adjusted his brass spectacles and set the escapement wheel into its jewel bearings.

For forty-seven years, travelers had brought broken pocket watches to his workshop at the turn of the Calleja de las Flores. But Mateo was no longer interested in seconds that melted like salt in the Guadalquivir river. He had spent his twilight years crafting a chronometer of moments that refused to die.

"A grandfather clock measures the dying of daylight," he whispered to Sofia, his apprentice, whose fingers were stained with lamp-oil and pumice. "This escapement does something gentler. It listens."

Whenever a person held the copper balance spring in their palm and recounted a vow they made before the war, the gears would hum in an unearthly harmonic key—three oscillations per second, neither fast nor slow, but steady as the beat of a faithful heart.

"What if they forget the vow?" Sofia asked, her voice hushed against the ticking walls.

Mateo turned the key twice in the winding arbor. "A truly made vow is etched into the iron of the sky. We merely wind the clock so it doesn't lose its rhythm."`,
    },
    {
      title: "The Architecture of Solitude",
      category: "Essay",
      description: "An inquiry into why quiet rooms, empty margins, and deliberate pauses form the indispensable soil of creative lucidity.",
      chainListingId: 4,
      fullText: `We inhabit an era that regards silence as an operational failure. Every empty pixel on a screen must be colonized by a notification; every silence in conversation must be cushioned by an ambient playlist.

Yet every monument of thought—from Montaigne's circular library in Dordogne to Ramanujan's slate tablets—was erected in deliberate seclusion. Solitude is not absence; it is the presence of one's own voice stripped of ambient echoes.

When an author closes the door and stares into the blank white sheet, what is being unlocked is not merely prose, but attention. To pay for words is an act of defiance against the endless tide of noise: it says that someone took the time to sculpt thought, and that we have taken the time to listen.`,
    },
    {
      title: "The Sovereign Pen: Independent Publishing on Public Ledgers",
      category: "Article",
      description: "How cryptographic micropayments eliminate intermediaries and establish a direct covenant of value between writers and readers.",
      chainListingId: 5,
      fullText: `For two centuries, literature lived under the patronage of publishing houses that decided who could speak and who must remain unread. The internet democratized distribution, but introduced a parasitic bargain: content became free, and readers became the product sold to ad brokers.

AlfaazVault demonstrates an alternative covenant. When a reader unlocks an article directly from a smart contract:
1. Value flows directly from reader to author without intermediary deductions.
2. The transaction is immutable and verified on a transparent public ledger.
3. Access rights are held cryptographically by the reader's wallet, forever readable and unrevokable.

This is not speculation; it is the renaissance of the digital salon.`,
    },
  ];

  for (const piece of cataloguePieces) {
    const contentHash = computeHash(piece.fullText);
    const priceWei = ethers.parseEther(PRICE).toString();

    const existing = await prisma.listing.findFirst({
      where: { chainListingId: piece.chainListingId },
    });

    if (!existing) {
      await prisma.listing.create({
        data: {
          chainListingId: piece.chainListingId,
          authorWallet: catalogueAuthor,
          title: piece.title,
          description: piece.description,
          category: piece.category,
          priceWei,
          fullText: piece.fullText,
          contentHash,
          createdTxHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          active: true,
          isDemo: false,
        },
      });
      console.log(`✓ Created catalogue listing #${piece.chainListingId}: ${piece.title}  (${PRICE} ETH)`);
    } else {
      // Update existing to match new settings
      await prisma.listing.update({
        where: { id: existing.id },
        data: {
          priceWei,
          isDemo: false,
          active: true,
          title: piece.title,
          description: piece.description,
          category: piece.category,
          fullText: piece.fullText,
          contentHash,
        },
      });
      console.log(`↻ Updated catalogue listing #${piece.chainListingId}: ${piece.title}  (${PRICE} ETH)`);
    }
  }

  console.log("\n🎉 Seeding finished! All 5 catalogue pieces are purchasable at 0.000001 ETH.");
  console.log("   chainListingIds: 1, 2, 3, 4, 5");
  console.log("   After deploying your contract, create 5 listings on-chain in the same order");
  console.log("   so the on-chain IDs match these chainListingIds.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
