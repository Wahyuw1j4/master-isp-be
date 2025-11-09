import psycopg2
from psycopg2 import sql
from pysnmp.hlapi import *
import uuid

conn = psycopg2.connect(
    dbname="isp",
    user="postgres",
    password="hesoyam404",
    host="localhost",
    port=5433,
    options="-c search_path=public"
)
cursor = conn.cursor()

def get_olt():
    query = sql.SQL("SELECT * FROM olt WHERE type = %s")
    cursor.execute(query, ('GPON',))
    olts = cursor.fetchall()
    return olts

def mapping_oid():
    olts = get_olt()
    print(olts)
    brands = list(set([olt[2] for olt in olts]))  # Assuming 'brand' is the 3rd column
    print(brands)
    query = sql.SQL("SELECT * FROM oid_map WHERE profile = ANY(%s)")
    cursor.execute(query, (brands,))
    mappings = cursor.fetchall()
    return mappings

def safe_decode(value, raw_hex=False):
    if raw_hex:
        try:
            b = bytes(value)
            decoded_part = ''.join(chr(c) for c in b[:4])
            hex_part = ''.join(f'{c:02X}' for c in b[4:])
            return f'{decoded_part}{hex_part}'
        except Exception:
            return str(value)
    else:
        try:
            return str(value.prettyPrint())
        except Exception:
            return str(value)

def generateCuid():
    return str(uuid.uuid4())

def snmp_bulk_walk(target, community, oid_mib, olt_id, callback=None):
    for (errorIndication,
         errorStatus,
         errorIndex,
         varBinds) in bulkCmd(SnmpEngine(),
                              CommunityData(community),
                              UdpTransportTarget((target, 161)),
                              ContextData(),
                              0,
                              25,
                              ObjectType(ObjectIdentity(oid_mib)),
                              lexicographicMode=False):

        if errorIndication:
            print(f"Error: {errorIndication}")
            break
        elif errorStatus:
            print(f"Error: {errorStatus.prettyPrint()} at {errorIndex}")
            break
        else:
            for varBind in varBinds:
                oid, value = varBind
                oid_str = str(oid)
                oidIdentifier = oid_str.replace(oid_mib, '')
                callback(oid, oidIdentifier, value, olt_id)

def saveZteC320(oid, oidIdentifier, value, olt_id):
    values = safe_decode(value, raw_hex=False)
    import re
    subs_id = re.sub(r'\s+', '', values).split('-')
    sqlFindSubsBySerial = "SELECT id FROM subscriptions WHERE id = %s"
    print(sqlFindSubsBySerial)
    cursor.execute(sqlFindSubsBySerial, (subs_id[0],))
    subscriptions = cursor.fetchone()
    if subscriptions:
        subscription_id = subscriptions[0]
        sqlCreateOnu = "INSERT INTO onus (id, olt_id, subscription_id, oid_identifier, serial, name, mac_address, description, onu_index) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (olt_id, oid_identifier) DO UPDATE SET olt_id = EXCLUDED.olt_id, subscription_id = EXCLUDED.subscription_id, oid_identifier = EXCLUDED.oid_identifier, name = EXCLUDED.name, mac_address = EXCLUDED.mac_address, description = EXCLUDED.description, onu_index = EXCLUDED.onu_index;"
        onu_id = generateCuid()
        # use the resolved subscription_id (string) instead of the parsed list `subs_id`
        cursor.execute(sqlCreateOnu, (onu_id, olt_id, subscription_id, oidIdentifier, None, None, None, None, None))
        conn.commit()
        print(f"Inserted subscription_id {subscription_id} with subs_id {subs_id} on OLT {olt_id}")
    print(oid, oidIdentifier, subs_id)
    print(f"{oid} = {subs_id}")

if __name__ == "__main__":
    mappings = mapping_oid() 
    olts = get_olt()
    for mapping in mappings:
        profile, oid, value = mapping[1], mapping[3], mapping[4]  # Adjust indices based on your table structure
        for olt in olts:
            oltId = olt[0]  # Assuming 'id' is the 1st column
            ip_address = olt[4]  # Assuming 'ip_address' is the 3rd column
            community = olt[5]   # Assuming 'community' is the 4th column
            print(olt[2])
            if olt[2] == "zte_c320_gpon":  # Assuming 'brand' is the 5th column
                print(ip_address, community, oltId)
                snmp_bulk_walk(ip_address, community, "1.3.6.1.4.1.3902.1012.3.28.1.1.2", olt_id=oltId, callback=saveZteC320)
        break;

