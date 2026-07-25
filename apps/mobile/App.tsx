import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

type Tab = 'Home' | 'Trucks' | 'Order' | 'Story';

type Vehicle = {
  id: string;
  name: string;
  zone: string;
  location: string;
  eta: number;
  status: 'ACTIVE' | 'RESTOCKING';
  inventory: { name: string; quantity: number }[];
};

const vehicles: Vehicle[] = [
  {
    id: 'truck-sunrise',
    name: 'Sunrise Runner',
    zone: 'South Side',
    location: 'Warm Springs & Las Vegas Blvd',
    eta: 12,
    status: 'ACTIVE',
    inventory: [
      { name: 'Red Chile Tamal', quantity: 28 },
      { name: 'Green Chile & Cheese', quantity: 19 },
      { name: 'Street Corn Cup', quantity: 16 }
    ]
  },
  {
    id: 'truck-valley',
    name: 'Valley Cruiser',
    zone: 'Central',
    location: 'Sahara & Valley View',
    eta: 18,
    status: 'ACTIVE',
    inventory: [
      { name: 'Red Chile Tamal', quantity: 21 },
      { name: 'Green Chile & Cheese', quantity: 14 },
      { name: 'Fruity Pebbles Dessert Tamal', quantity: 7 }
    ]
  },
  {
    id: 'truck-family',
    name: 'Family Kitchen',
    zone: 'West Side',
    location: 'Restocking for the evening route',
    eta: 35,
    status: 'RESTOCKING',
    inventory: []
  }
];

export default function App() {
  const [tab, setTab] = useState<Tab>('Home');
  const [selectedVehicleId, setSelectedVehicleId] = useState('truck-sunrise');
  const selectedVehicle = useMemo(() => vehicles.find(vehicle => vehicle.id === selectedVehicleId) ?? vehicles[0], [selectedVehicleId]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFDF8" />
      <View style={styles.header}>
        <View style={styles.logo}><Text style={styles.logoCorn}>◆</Text></View>
        <View style={styles.brand}><Text style={styles.brandPrimary}>Crave It</Text><Text style={styles.brandSecondary}>I Create It</Text></View>
        <View style={styles.livePill}><View style={styles.liveDot}/><Text style={styles.liveText}>2 ACTIVE</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'Home' && <HomeScreen onOrder={() => setTab('Order')} onTrucks={() => setTab('Trucks')} />}
        {tab === 'Trucks' && <TrucksScreen selectedVehicleId={selectedVehicleId} onSelect={setSelectedVehicleId} onOrder={() => setTab('Order')} />}
        {tab === 'Order' && <OrderScreen vehicle={selectedVehicle} />}
        {tab === 'Story' && <StoryScreen />}
      </ScrollView>

      <View style={styles.nav}>
        {(['Home', 'Trucks', 'Order', 'Story'] as Tab[]).map(item => (
          <TouchableOpacity key={item} style={styles.navItem} onPress={() => setTab(item)}>
            <Text style={[styles.navIcon, tab === item && styles.navIconActive]}>{item === 'Home' ? '⌂' : item === 'Trucks' ? '⌖' : item === 'Order' ? '+' : '◌'}</Text>
            <Text style={[styles.navLabel, tab === item && styles.navLabelActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({ onOrder, onTrucks }: { onOrder: () => void; onTrucks: () => void }) {
  return <>
    <Text style={styles.eyebrow}>FAMILY RECIPES ON THE MOVE</Text>
    <Text style={styles.heroTitle}>Follow the flavor.{`\n`}<Text style={styles.accent}>Find the family.</Text></Text>
    <Text style={styles.body}>Live vehicle locations, real inventory, and nearby drop-off without chasing the route across town.</Text>
    <View style={styles.mapCard}>
      <View style={styles.mapGlowOne}/><View style={styles.mapGlowTwo}/>
      <View style={[styles.mapPin, { left: 58, top: 136 }]}><Text style={styles.mapPinCount}>28</Text><Text style={styles.mapPinLabel}>LEFT</Text></View>
      <View style={[styles.mapPin, styles.mapPinGreen, { right: 62, top: 72 }]}><Text style={styles.mapPinCount}>21</Text><Text style={styles.mapPinLabel}>LEFT</Text></View>
      <View style={styles.mapSummary}><View><Text style={styles.cardEyebrow}>NEAREST KITCHEN</Text><Text style={styles.mapSummaryTitle}>Sunrise Runner</Text><Text style={styles.muted}>12 min · South Side</Text></View><TouchableOpacity style={styles.circleButton} onPress={onTrucks}><Text style={styles.circleButtonText}>→</Text></TouchableOpacity></View>
    </View>
    <TouchableOpacity style={styles.primaryButton} onPress={onOrder}><Text style={styles.primaryButtonText}>Start an order</Text></TouchableOpacity>
    <Text style={styles.sectionTitle}>Rolling now</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
      {vehicles.filter(vehicle => vehicle.status === 'ACTIVE').map(vehicle => <View key={vehicle.id} style={styles.miniVehicle}><Text style={styles.cardEyebrow}>{vehicle.zone.toUpperCase()}</Text><Text style={styles.miniVehicleTitle}>{vehicle.name}</Text><Text style={styles.muted}>{vehicle.inventory.reduce((sum, item) => sum + item.quantity, 0)} items available</Text></View>)}
    </ScrollView>
  </>;
}

function TrucksScreen({ selectedVehicleId, onSelect, onOrder }: { selectedVehicleId: string; onSelect: (id: string) => void; onOrder: () => void }) {
  return <>
    <Text style={styles.eyebrow}>LIVE ROUTE BOARD</Text>
    <Text style={styles.pageTitle}>Find what is moving near you.</Text>
    {vehicles.map(vehicle => {
      const selected = vehicle.id === selectedVehicleId;
      return <TouchableOpacity key={vehicle.id} style={[styles.vehicleCard, selected && styles.vehicleCardSelected]} onPress={() => onSelect(vehicle.id)}>
        <View style={styles.rowBetween}><View><Text style={styles.cardEyebrow}>{vehicle.zone.toUpperCase()}</Text><Text style={styles.vehicleName}>{vehicle.name}</Text></View><Text style={[styles.status, vehicle.status !== 'ACTIVE' && styles.statusRestocking]}>{vehicle.status}</Text></View>
        <Text style={styles.location}>⌖ {vehicle.location}</Text>
        {vehicle.inventory.map(item => <View key={item.name} style={styles.inventoryRow}><Text style={styles.inventoryName}>{item.name}</Text><Text style={styles.inventoryCount}>{item.quantity} left</Text></View>)}
        {vehicle.status === 'ACTIVE' && <TouchableOpacity style={styles.secondaryButton} onPress={onOrder}><Text style={styles.secondaryButtonText}>Order from this vehicle</Text></TouchableOpacity>}
      </TouchableOpacity>;
    })}
  </>;
}

function OrderScreen({ vehicle }: { vehicle: Vehicle }) {
  const [fulfillment, setFulfillment] = useState<'PICKUP' | 'DROP_OFF'>('PICKUP');
  return <>
    <Text style={styles.eyebrow}>RESERVE BEFORE THE ROUTE MOVES</Text>
    <Text style={styles.pageTitle}>Order from {vehicle.name}.</Text>
    <View style={styles.orderNotice}><Text style={styles.orderNoticeTitle}>Live vehicle stock</Text><Text style={styles.muted}>{vehicle.inventory.reduce((sum, item) => sum + item.quantity, 0)} items currently available near {vehicle.location}.</Text></View>
    <Text style={styles.label}>ITEM</Text>
    <View style={styles.selectBox}><Text style={styles.selectText}>{vehicle.inventory[0]?.name ?? 'Restocking'}</Text><Text>⌄</Text></View>
    <View style={styles.toggleRow}>
      <TouchableOpacity style={[styles.toggle, fulfillment === 'PICKUP' && styles.toggleActive]} onPress={() => setFulfillment('PICKUP')}><Text style={[styles.toggleText, fulfillment === 'PICKUP' && styles.toggleTextActive]}>Meet the truck</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.toggle, fulfillment === 'DROP_OFF' && styles.toggleActive]} onPress={() => setFulfillment('DROP_OFF')}><Text style={[styles.toggleText, fulfillment === 'DROP_OFF' && styles.toggleTextActive]}>Nearby drop-off</Text></TouchableOpacity>
    </View>
    <Text style={styles.label}>YOUR NAME</Text><TextInput style={styles.input} placeholder="Name" placeholderTextColor="#9B8175" />
    <Text style={styles.label}>PHONE</Text><TextInput style={styles.input} keyboardType="phone-pad" placeholder="(702) 555-0123" placeholderTextColor="#9B8175" />
    {fulfillment === 'DROP_OFF' && <><Text style={styles.label}>DROP-OFF ADDRESS</Text><TextInput style={styles.input} placeholder="Street address" placeholderTextColor="#9B8175" /></>}
    <TouchableOpacity style={styles.primaryButton}><Text style={styles.primaryButtonText}>Reserve order</Text></TouchableOpacity>
    <Text style={styles.disclaimer}>This native scaffold is UI-first. The website already demonstrates the API-backed inventory deduction flow.</Text>
  </>;
}

function StoryScreen() {
  return <>
    <View style={styles.storyHero}><Text style={styles.storyIcon}>◆</Text></View>
    <Text style={styles.eyebrow}>BUILT FROM A FAMILY RECIPE</Text>
    <Text style={styles.pageTitle}>The route changes. The reason does not.</Text>
    <Text style={styles.body}>This area is prepared for the real family story, the grandmother behind the cooking, the people working each route, and the quotes that make the business personal.</Text>
    <View style={styles.quote}><Text style={styles.quoteText}>“The food moves around town, but the recipe still comes from home.”</Text></View>
    <Text style={styles.sectionTitle}>The Concept Lab</Text>
    <Text style={styles.body}>Hot Cheetos, dessert cereal, chicken Alfredo, or the next idea nobody has tried yet. You crave it. The kitchen creates it.</Text>
  </>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFDF8' },
  header: { height: 72, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E7D7C8' },
  logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F26722', alignItems: 'center', justifyContent: 'center' },
  logoCorn: { color: '#FFF6E8', fontSize: 20 },
  brand: { marginLeft: 10, flex: 1 },
  brandPrimary: { color: '#24150F', fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  brandSecondary: { color: '#F26722', fontSize: 9, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#EDF4E8' },
  liveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#5B9B46' },
  liveText: { color: '#45673A', fontSize: 9, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 34, paddingBottom: 110 },
  eyebrow: { color: '#C94A0B', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
  heroTitle: { color: '#24150F', fontSize: 46, lineHeight: 46, fontWeight: '900', letterSpacing: -2.4 },
  pageTitle: { color: '#24150F', fontSize: 40, lineHeight: 42, fontWeight: '900', letterSpacing: -2, marginBottom: 22 },
  accent: { color: '#F26722', fontStyle: 'italic' },
  body: { color: '#765D52', fontSize: 16, lineHeight: 26, marginTop: 18, marginBottom: 24 },
  mapCard: { height: 310, borderRadius: 32, backgroundColor: '#EFE2CB', overflow: 'hidden', position: 'relative', marginTop: 10, marginBottom: 20 },
  mapGlowOne: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: '#F5BD3B55', top: -50, right: -40 },
  mapGlowTwo: { position: 'absolute', width: 150, height: 150, borderRadius: 999, backgroundColor: '#48663C26', left: -50, bottom: -45 },
  mapPin: { position: 'absolute', width: 76, height: 76, borderRadius: 25, backgroundColor: '#F26722', borderWidth: 6, borderColor: '#FFF9F0', alignItems: 'center', justifyContent: 'center' },
  mapPinGreen: { backgroundColor: '#48663C' },
  mapPinCount: { color: 'white', fontSize: 24, fontWeight: '900' },
  mapPinLabel: { color: 'white', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  mapSummary: { position: 'absolute', left: 14, right: 14, bottom: 14, padding: 16, backgroundColor: '#FFFDF8EE', borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardEyebrow: { color: '#C94A0B', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: 5 },
  mapSummaryTitle: { color: '#24150F', fontSize: 17, fontWeight: '800' },
  muted: { color: '#765D52', fontSize: 12, lineHeight: 18 },
  circleButton: { width: 42, height: 42, borderRadius: 99, backgroundColor: '#24150F', alignItems: 'center', justifyContent: 'center' },
  circleButtonText: { color: 'white', fontSize: 20 },
  primaryButton: { backgroundColor: '#F26722', borderRadius: 999, alignItems: 'center', paddingVertical: 16, marginTop: 8, shadowColor: '#F26722', shadowOpacity: .22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  primaryButtonText: { color: 'white', fontSize: 15, fontWeight: '800' },
  sectionTitle: { color: '#24150F', fontSize: 25, fontWeight: '900', letterSpacing: -1, marginTop: 34, marginBottom: 14 },
  horizontalCards: { gap: 12, paddingRight: 20 },
  miniVehicle: { width: 220, padding: 18, borderRadius: 22, backgroundColor: '#FFF6E8', borderWidth: 1, borderColor: '#F0DFCE' },
  miniVehicleTitle: { color: '#24150F', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  vehicleCard: { borderWidth: 1, borderColor: '#E6D6C8', borderRadius: 24, padding: 18, marginBottom: 14, backgroundColor: 'white' },
  vehicleCardSelected: { borderColor: '#F26722', backgroundColor: '#FFF9F2' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  vehicleName: { color: '#24150F', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  status: { color: '#3C6A34', backgroundColor: '#E9F4E6', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, fontSize: 8, fontWeight: '900', height: 27 },
  statusRestocking: { color: '#8A5C22', backgroundColor: '#F4E8D7' },
  location: { color: '#765D52', fontSize: 12, marginVertical: 14 },
  inventoryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E7D7C8' },
  inventoryName: { color: '#4F3A31', fontSize: 12 },
  inventoryCount: { color: '#C94A0B', fontSize: 12, fontWeight: '800' },
  secondaryButton: { borderWidth: 1, borderColor: '#F26722', borderRadius: 999, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  secondaryButtonText: { color: '#C94A0B', fontWeight: '800', fontSize: 12 },
  orderNotice: { padding: 18, borderRadius: 22, backgroundColor: '#FFF6E8', marginBottom: 24 },
  orderNoticeTitle: { color: '#24150F', fontWeight: '900', fontSize: 16, marginBottom: 5 },
  label: { color: '#765D52', fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 16, marginBottom: 7 },
  selectBox: { borderWidth: 1, borderColor: '#E6D6C8', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 15, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white' },
  selectText: { color: '#24150F', fontSize: 14, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#E6D6C8', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 15, color: '#24150F', backgroundColor: 'white' },
  toggleRow: { flexDirection: 'row', gap: 10, marginVertical: 16 },
  toggle: { flex: 1, paddingVertical: 13, borderRadius: 999, backgroundColor: '#F3ECE5', alignItems: 'center' },
  toggleActive: { backgroundColor: '#24150F' },
  toggleText: { color: '#765D52', fontSize: 11, fontWeight: '800' },
  toggleTextActive: { color: 'white' },
  disclaimer: { color: '#9B8175', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 14 },
  storyHero: { height: 220, borderRadius: 30, backgroundColor: '#F26722', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  storyIcon: { color: '#FFF6E8', fontSize: 90 },
  quote: { borderLeftWidth: 3, borderLeftColor: '#F26722', paddingLeft: 18, marginVertical: 18 },
  quoteText: { color: '#24150F', fontSize: 21, lineHeight: 30, fontStyle: 'italic', fontWeight: '600' },
  nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#FFFDF8F5', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E6D6C8', flexDirection: 'row', paddingBottom: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIcon: { color: '#9B8175', fontSize: 20, marginBottom: 2 },
  navIconActive: { color: '#F26722' },
  navLabel: { color: '#9B8175', fontSize: 9, fontWeight: '700' },
  navLabelActive: { color: '#24150F', fontWeight: '900' }
});
