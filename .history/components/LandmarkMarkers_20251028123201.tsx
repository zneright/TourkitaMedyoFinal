import { CircleLayer, Images, ShapeSource, SymbolLayer } from "@rnmapbox/maps";
import { OnPressEvent } from "@rnmapbox/maps/lib/typescript/src/types/OnPressEvent";
import { featureCollection, point } from "@turf/helpers";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useLandmark } from "../provider/LandmarkProvider";
import EventDetailModal from "./EventDetailModal";
import EventListModal from "./EventListModal";
import { useNavigation } from "@react-navigation/native";
import { format, isWithinInterval, parseISO, startOfToday } from "date-fns";

export default function LandmarkMarkers({ selectedCategory, onLoadingChange }: any) {
    const { setSelectedLandmark } = useLandmark();
    const [landmarks, setLandmarks] = useState<any[]>([]);
    const [eventsAtLocation, setEventsAtLocation] = useState<any[]>([]);
    const [showEventListModal, setShowEventListModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLandmarks([]);
                onLoadingChange(true);

                if (selectedCategory === "Events") {
                    const snapshot = await getDocs(collection(db, "events"));
                    const now = new Date();
                    const today = format(now, "EEE").toLowerCase();
                    const todayDate = startOfToday();
                    const fetched: any[] = [];

                    for (const docSnap of snapshot.docs) {
                        const data = docSnap.data();
                        const recurrence = data.recurrence || {};
                        const startDate = data.startDate ? parseISO(data.startDate) : null;
                        const endDate = data.endDate ? parseISO(data.endDate) : startDate;

                        if (!endDate || endDate < todayDate) continue;

                        let occursToday = false;
                        if (recurrence.frequency === "weekly" && startDate) {
                            const isInDateRange = isWithinInterval(now, { start: startDate, end: endDate });
                            occursToday = recurrence.daysOfWeek?.includes(today) && isInDateRange;
                        } else if (recurrence.frequency === "once" && startDate) {
                            occursToday = format(now, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd");
                        }

                        let lat = data.lat;
                        let lng = data.lng;
                        if ((!data.customAddress || !data.customAddress.trim()) && data.locationId) {
                            const markerDoc = await getDoc(doc(db, "markers", String(data.locationId)));
                            if (markerDoc.exists()) {
                                const marker = markerDoc.data();
                                lat = parseFloat(marker.latitude);
                                lng = parseFloat(marker.longitude);
                            }
                        }

                        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                            fetched.push({ ...data, latitude: lat, longitude: lng, category: "Event", occursToday });
                        } else {
                            console.warn(`Skipping event "${data.title}" due to missing/invalid coordinates.`);
                        }
                    }
                    setLandmarks(fetched);
                } else {
                    const snapshot = await getDocs(collection(db, "markers"));
                    const fetched = snapshot.docs.map((doc) => {
                        const data = doc.data();
                        const lat = parseFloat(data.latitude);
                        const lng = parseFloat(data.longitude);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            return { ...data, latitude: lat, longitude: lng };
                        }
                        console.warn(`Skipping marker "${data.name}" due to invalid coordinates.`);
                        return null;
                    }).filter(Boolean);

                    setLandmarks(fetched);
                }
            } catch (err) {
                console.error("Failed to fetch landmarks/events:", err);
            } finally {
                onLoadingChange(false);
            }
        };
        fetchData();
    }, [selectedCategory]);

    const filtered = landmarks.filter((l) => {
        if (selectedCategory === "All") return true;
        if (selectedCategory === "Restroom") return l.accessibleRestroom === true;
        if (selectedCategory === "Events") return true;
        if (selectedCategory === "AR") return l.arCameraSupported === true;
        if (selectedCategory === "Relics/Artifacts") return l.categoryOption === "Relics/Artifacts";
        return l.category === selectedCategory || l.categoryOption === selectedCategory;
    });

    const getIconKey = (landmark) => {
        if (landmark.category === "Event") return "event";
        const name = landmark.name?.toLowerCase() || "";
        const category = (landmark.category || "").toLowerCase();

        if (selectedCategory === "Restroom" && landmark.accessibleRestroom) return "restroom";

        if (name.includes("museum") || category === "museum") return "museum";
        if (name.includes("historical") || category === "historical") return "historical";
        if (name.includes("government") || category === "government") return "government";
        if (name.includes("park") || category === "park") return "park";
        if (name.includes("food") || category === "food") return "food";
        if (name.includes("school") || category === "school") return "school";
        return "pin"; // Default fallback icon
    };

    const points = filtered.map((landmark, index) =>
        point([landmark.longitude, landmark.latitude], {
            landmark: JSON.stringify(landmark),
            id: index,
            iconKey: getIconKey(landmark),
            name: landmark.category === "Event" ? landmark.title || "Untitled Event" : landmark.name || "Unnamed",
            isToday: landmark.category === "Event" ? landmark.occursToday || false : false,
        })
    );

    const navigation = useNavigation();

    const onPointPress = async (event) => {
        try {
            const landmarkStr = event.features[0].properties?.landmark;
            if (!landmarkStr) return;
            const landmark = JSON.parse(landmarkStr);

            if (landmark.category === "Event") {
                const eventsHere = landmarks.filter(l => l.category === "Event" && parseFloat(l.latitude) === parseFloat(landmark.latitude) && parseFloat(l.longitude) === parseFloat(landmark.longitude));
                if (eventsHere.length > 1) {
                    setEventsAtLocation(eventsHere);
                    setShowEventListModal(true);
                } else if (eventsHere.length === 1) {
                    setSelectedEvent(eventsHere[0]);
                }
                return;
            }
            setSelectedLandmark(landmark);
        } catch (error) {
            console.error("Error onPointPress:", error);
        }
    };

    return (
        <>
            <Images
                images={{
                    restroom: require("../assets/restroom.png"),
                    museum: require("../assets/museum.png"),
                    historical: require("../assets/historical.png"),
                    government: require("../assets/government.png"),
                    park: require("../assets/park.png"),
                    food: require("../assets/food.png"),
                    school: require("../assets/school.png"),
                    event: require("../assets/events.png"),
                    pin: require("../assets/relics.png"),
                }}
            />
            <ShapeSource id="landmarks" shape={featureCollection(points)} onPress={onPointPress}>
                {selectedCategory === "Events" && (
                    <CircleLayer id="event-today-highlight" style={{ circleColor: "#ff6600", circleRadius: 12, circleBlur: 1, circleOpacity: 0.5 }} filter={["==", ["get", "isToday"], true]} />
                )}
                <SymbolLayer id="landmark-icons" style={{ iconImage: ["get", "iconKey"], iconSize: 0.09, iconAllowOverlap: true, iconAnchor: "bottom" }} />
                <SymbolLayer id="landmark-labels" style={{ textField: ["get", "name"], textSize: ["interpolate", ["linear"], ["zoom"], 10, 6, 15, 9, 18, 11], textOffset: [0, 1.1], textColor: "#000000", textHaloColor: "#ffffff", textHaloWidth: 1, textAnchor: "bottom" }} />
            </ShapeSource>
            {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
            {showEventListModal && <EventListModal events={eventsAtLocation} onClose={() => setShowEventListModal(false)} onSelect={(event) => { setSelectedEvent(event); setShowEventListModal(false); }} />}
        </>
    );
}