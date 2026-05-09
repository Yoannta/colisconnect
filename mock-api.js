(function () {
    const STORAGE_KEYS = {
        travelers: "cc_travelers_v2",
        conversations: "cc_conversations_v2",
        messages: "cc_messages_v2"
    };

    const seedTravelers = [
        {
            id: 1,
            name: "Sophie Martin",
            avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
            destination: "Abidjan, Côte d'Ivoire",
            departureDate: "2026-03-15",
            availableKg: 12,
            pricePerKg: 10,
            flightNumber: "AF750",
            rating: 4.9,
            reviews: 52,
            isVerified: true
        },
        {
            id: 2,
            name: "Jean-Paul Kouassi",
            avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
            destination: "Abidjan, Côte d'Ivoire",
            departureDate: "2026-03-18",
            availableKg: 6,
            pricePerKg: 8,
            flightNumber: "SN281",
            rating: 4.7,
            reviews: 31,
            isVerified: true
        },
        {
            id: 3,
            name: "Marie Dubois",
            avatar: "https://i.pravatar.cc/150?u=a04258114e29026302d",
            destination: "Dakar, Sénégal",
            departureDate: "2026-03-20",
            availableKg: 20,
            pricePerKg: 12,
            flightNumber: "AF718",
            rating: 4.8,
            reviews: 19,
            isVerified: false
        },
        {
            id: 4,
            name: "Rachid El Mansouri",
            avatar: "https://i.pravatar.cc/150?u=a042581f4e29020099d",
            destination: "Casablanca, Maroc",
            departureDate: "2026-03-22",
            availableKg: 15,
            pricePerKg: 11,
            flightNumber: "AT789",
            rating: 4.9,
            reviews: 43,
            isVerified: true
        },
        {
            id: 5,
            name: "Aminata Diallo",
            avatar: "https://i.pravatar.cc/150?u=a042581f4e29020321d",
            destination: "Abidjan, Côte d'Ivoire",
            departureDate: "2026-03-26",
            availableKg: 3,
            pricePerKg: 14,
            flightNumber: "HF531",
            rating: 4.6,
            reviews: 12,
            isVerified: false
        }
    ];

    const seedConversations = [
        {
            id: "conv_1",
            travelerId: 1,
            travelerName: "Sophie Martin",
            travelerAvatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
            status: "En ligne",
            lastMessageAt: "2026-02-15T14:20:00.000Z"
        },
        {
            id: "conv_2",
            travelerId: 2,
            travelerName: "Jean-Paul Kouassi",
            travelerAvatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
            status: "Actif il y a 12 min",
            lastMessageAt: "2026-02-15T11:50:00.000Z"
        }
    ];

    const seedMessages = {
        conv_1: [
            {
                id: "m_1",
                sender: "traveler",
                text: "Bonjour ! Je pars à Abidjan le 15 mars. Vous souhaitez envoyer quoi ?",
                createdAt: "2026-02-15T14:00:00.000Z"
            },
            {
                id: "m_2",
                sender: "user",
                text: "Bonjour Sophie, un colis de 5 kg avec vêtements et livres.",
                createdAt: "2026-02-15T14:02:00.000Z"
            },
            {
                id: "m_3",
                sender: "traveler",
                text: "Parfait, je peux le prendre à 10€ par kilo. Cela vous convient ?",
                createdAt: "2026-02-15T14:04:00.000Z"
            },
            {
                id: "m_4",
                sender: "user",
                text: "Oui, c'est parfait pour moi.",
                createdAt: "2026-02-15T14:06:00.000Z"
            },
            {
                id: "m_5",
                sender: "traveler",
                text: "Super. On se retrouve gare de Lyon à 14h ?",
                createdAt: "2026-02-15T14:08:00.000Z"
            }
        ],
        conv_2: [
            {
                id: "m_6",
                sender: "traveler",
                text: "Bonjour, je peux transporter jusqu'à 6 kg sur ce trajet.",
                createdAt: "2026-02-15T11:45:00.000Z"
            },
            {
                id: "m_7",
                sender: "user",
                text: "Parfait, quel est votre prix final pour 4 kg ?",
                createdAt: "2026-02-15T11:50:00.000Z"
            }
        ]
    };

    const autoReplies = [
        "Parfait, je vous confirme rapidement les détails logistiques.",
        "Très bien, je vous envoie le point de rendez-vous précis.",
        "D'accord, proposition validée de mon côté.",
        "Top, je reste disponible si vous avez d'autres questions."
    ];

    const flightDirectory = [
        "AF750",
        "SN281",
        "AF718",
        "AT789",
        "HF531",
        "IB602",
        "LH1034",
        "EK073",
        "AC872"
    ];

    function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function readStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                return deepClone(fallback);
            }
            return JSON.parse(raw);
        } catch {
            return deepClone(fallback);
        }
    }

    function writeStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function ensureSeedData() {
        if (!localStorage.getItem(STORAGE_KEYS.travelers)) {
            writeStorage(STORAGE_KEYS.travelers, seedTravelers);
        }
        if (!localStorage.getItem(STORAGE_KEYS.conversations)) {
            writeStorage(STORAGE_KEYS.conversations, seedConversations);
        }
        if (!localStorage.getItem(STORAGE_KEYS.messages)) {
            writeStorage(STORAGE_KEYS.messages, seedMessages);
        }
    }

    function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms || 180));
    }

    function normalizeText(value) {
        return (value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }

    function normalizeFlightNumber(value) {
        return String(value || "")
            .toUpperCase()
            .replace(/\s+/g, "")
            .trim();
    }

    function verifyFlightCandidate(number) {
        const normalized = normalizeFlightNumber(number);
        if (!/^[A-Z]{2}\d{2,4}$/.test(normalized)) {
            return { exists: false, error: "Format invalide. Exemple attendu: AF750." };
        }
        if (!flightDirectory.includes(normalized)) {
            return { exists: false, error: "Ce numero de vol n'existe pas." };
        }
        return { exists: true, flightNumber: normalized };
    }

    function nextId(collection) {
        const maxId = collection.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
        return maxId + 1;
    }

    function messagePreview(message) {
        return message && message.text ? message.text : "Aucun message";
    }

    function enrichConversations(conversations, messagesMap) {
        return conversations
            .map((conversation) => {
                const messages = messagesMap[conversation.id] || [];
                const latestMessage = messages[messages.length - 1];
                return {
                    ...conversation,
                    preview: messagePreview(latestMessage),
                    lastMessageAt: latestMessage && latestMessage.createdAt ? latestMessage.createdAt : conversation.lastMessageAt
                };
            })
            .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    }

    ensureSeedData();

    async function getTravelers() {
        await delay();
        const travelers = readStorage(STORAGE_KEYS.travelers, seedTravelers);
        return travelers.sort((a, b) => b.rating - a.rating);
    }

    async function searchTravelers(filters) {
        const travelers = await getTravelers();
        const destination = normalizeText(filters.destination || "");
        return travelers
            .filter((traveler) => normalizeText(traveler.destination).includes(destination))
            .filter((traveler) => traveler.pricePerKg <= Number(filters.maxPrice || 999))
            .filter((traveler) => traveler.availableKg >= Number(filters.minKg || 1))
            .filter((traveler) => !filters.verifiedOnly || traveler.isVerified);
    }

    async function createTrip(payload) {
        await delay(220);
        const flightCheck = verifyFlightCandidate(payload.flightNumber);
        if (!flightCheck.exists) {
            throw new Error(flightCheck.error || "Ce numero de vol n'existe pas.");
        }

        const travelers = readStorage(STORAGE_KEYS.travelers, seedTravelers);
        const createdTraveler = {
            id: nextId(travelers),
            name: "Vous (Voyageur)",
            avatar: "https://i.pravatar.cc/150?u=colisconnect-new-traveler",
            destination: payload.destination,
            departureDate: payload.departureDate,
            availableKg: Number(payload.availableKg),
            pricePerKg: Number(payload.pricePerKg),
            flightNumber: flightCheck.flightNumber,
            rating: 5,
            reviews: 0,
            isVerified: false
        };

        travelers.push(createdTraveler);
        writeStorage(STORAGE_KEYS.travelers, travelers);

        return deepClone(createdTraveler);
    }

    async function verifyFlightNumber(payload) {
        await delay(120);
        return verifyFlightCandidate(payload && payload.number);
    }

    async function getConversations() {
        await delay();
        const conversations = readStorage(STORAGE_KEYS.conversations, seedConversations);
        const messagesMap = readStorage(STORAGE_KEYS.messages, seedMessages);
        return enrichConversations(conversations, messagesMap);
    }

    async function getMessages(conversationId) {
        await delay(120);
        const messagesMap = readStorage(STORAGE_KEYS.messages, seedMessages);
        return deepClone(messagesMap[conversationId] || []);
    }

    async function getOrCreateConversationByTravelerId(travelerId) {
        await delay(140);
        const conversations = readStorage(STORAGE_KEYS.conversations, seedConversations);
        const messagesMap = readStorage(STORAGE_KEYS.messages, seedMessages);
        const travelers = readStorage(STORAGE_KEYS.travelers, seedTravelers);

        const existing = conversations.find((conversation) => Number(conversation.travelerId) === Number(travelerId));
        if (existing) {
            return deepClone(existing);
        }

        const traveler = travelers.find((item) => Number(item.id) === Number(travelerId));
        if (!traveler) {
            return null;
        }

        const newConversation = {
            id: `conv_${Date.now()}`,
            travelerId: traveler.id,
            travelerName: traveler.name,
            travelerAvatar: traveler.avatar,
            status: "Nouveau contact",
            lastMessageAt: new Date().toISOString()
        };

        conversations.push(newConversation);
        messagesMap[newConversation.id] = [
            {
                id: `m_${Date.now()}`,
                sender: "system",
                text: `Conversation ouverte avec ${traveler.name}.`,
                createdAt: new Date().toISOString()
            }
        ];

        writeStorage(STORAGE_KEYS.conversations, conversations);
        writeStorage(STORAGE_KEYS.messages, messagesMap);

        return deepClone(newConversation);
    }

    async function sendMessage(conversationId, text, sender) {
        await delay(90);
        const messagesMap = readStorage(STORAGE_KEYS.messages, seedMessages);
        const conversations = readStorage(STORAGE_KEYS.conversations, seedConversations);
        const nowIso = new Date().toISOString();

        if (!messagesMap[conversationId]) {
            messagesMap[conversationId] = [];
        }

        const message = {
            id: `m_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            sender: sender || "user",
            text,
            createdAt: nowIso
        };

        messagesMap[conversationId].push(message);

        const conversation = conversations.find((item) => item.id === conversationId);
        if (conversation) {
            conversation.lastMessageAt = nowIso;
        }

        writeStorage(STORAGE_KEYS.messages, messagesMap);
        writeStorage(STORAGE_KEYS.conversations, conversations);

        return deepClone(message);
    }

    async function sendAutoReply(conversationId) {
        const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
        return sendMessage(conversationId, randomReply, "traveler");
    }

    window.MockApi = {
        searchTravelers,
        createTrip,
        verifyFlightNumber,
        getConversations,
        getMessages,
        getOrCreateConversationByTravelerId,
        sendMessage,
        sendAutoReply
    };
})();

