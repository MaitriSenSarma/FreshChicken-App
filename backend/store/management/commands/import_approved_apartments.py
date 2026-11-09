from django.core.management.base import BaseCommand
from store.models import DeliveryApartment


# Client-provided approved apartment list. Duplicate names are included only once.
APARTMENTS = [
    ('4SIGHT VIVANTE', '700103'),
    ('4SIGHT GRAND CASTLE', '700084'),
    ('ATRI GREEN VALLEY', '700151'),
    ('ATRI GREEN ENCLAVE', '700151'),
    ('ATRI AQUA', '700151'),
    ('ATRI RAYS', '700103'),
    ('ATRI GREEN PALACE', '700103'),
    ('AMAYA RESIDENCES', '700149'),
    ('AKSHARA PEARL', '700103'),
    ('AMRITA VIHAR COMPLEX', '700103'),
    ('BOTANICA', '700151'),
    ('CITRUS CLOVE', '700103'),
    ('CHARUCHHAYA', '700151'),
    ('DEESHARI MEGACITY', '700151'),
    ('DEESHARI ORCHID', '700151'),
    ('DEVALOKE NEST', '700103'),
    ('DNP HEIGHTS', '700151'),
    ('EASTERN HARIMOTI', '700103'),
    ('FOUNTAIN EXOTICA', '700103'),
    ('GREENWOOD', '700103'),
    ('HINDUSTAN ENCLAVE', '700103'),
    ('IDOL SHELTER', '700103'),
    ('KAILASH APARTMENT', '700149'),
    ('LAA PROXIMA', '700103'),
    ('MAYFAIR BLOOM', '700151'),
    ('MAYFAIR BLOSSOM', '700151'),
    ('MAYFAIR SYMPHONY', '700151'),
    ('MAYFAIR GREENS', '700103'),
    ('MAYFAIR VENUS', '700103'),
    ('MAYFAIR VENUS II', '700103'),
    ('MAYFAIR ELITE', '700103'),
    ('MAYFAIR WHITEFIELD', '700151'),
    ('MAYFAIR GALAXY', '700151'),
    ('MANJURI GARDEN', '700103'),
    ('MODELLO HIGHS', '700103'),
    ('MOONLIT HEIGHTS', '700103'),
    ('MANSIA SQUARE', '700103'),
    ('MERUJEEN', '700103'),
    ('MANGAL BHAWAN', '700149'),
    ('MANDIR APARTMENT', '700103'),
    ('MERLIN SKYGAZE', '700148'),
    ('NIRMALA BREEZE', '700151'),
    ('NARENDRA ENCLAVE', '700103'),
    ('OZONE', '700103'),
    ('PLEASANT PALACE', '700149'),
    ('PACIFIC SHRISTI', '700151'),
    ('PEARL RESIDENCY', '700103'),
    ('PRUDENT AMARA', '700151'),
    ('PANCHMUKHI', '700151'),
    ('PRUDENT PRAGATI', '700151'),
    ('PROGRESSIVE GREEN', '700151'),
    ('PRESTIGE RESIDENCES', '700151'),
    ('PRUDENT GOKULAM', '700151'),
    ('RAJWADA HEIGHTS', '700103'),
    ('RAJWADA ROYAL GARDEN', '700151'),
    ('RAJWADA ROSEWOOD', '700151'),
    ('RAJWADA GLOBAL CITY', '700103'),
    ('RAJWADA SPRINGFIELD', '700103'),
    ('RAJWADA EMERALDS', '700103'),
    ('RAJWADA GRAND', '700103'),
    ('RAJWADA ESTATE', '700084'),
    ('RAJWADA ALTITUDE', '700084'),
    ('RAJWADA BLUES', '700151'),
    ('RAJWADA NIRVANA', '700103'),
    ('RAJWADA PEARL', '700103'),
    ('RAJWADA PEBBLE BAY', '700103'),
    ('RAJWADA GREENSHIRE', '700103'),
    ('RAJWADA RADIANCE', '700103'),
    ('REALMARK ORACLE', '700103'),
    ('RAJAT FLORA', '700103'),
    ('SU CASA TWINS', '700151'),
    ('SOUTHERN VISTA', '700145'),
    ('SOUTHWINDS', '700148'),
    ('SHERWOOD ESTATE', '700103'),
    ('SUGAM PARK', '700103'),
    ('SUGAM PRAKRITI', '700103'),
    ('SUGAM SABUJ', '700103'),
    ('SGIL GARDENIA', '700149'),
    ('SRIJAN NIRVANA', '700151'),
    ('SU CASA GREEN', '700103'),
    ('SYMPHONY SERENITY', '700103'),
    ('SU CASA WOOD', '700151'),
    ('SU CASA ROYAL', '700103'),
    ('SKYLINE IMPERIA', '700151'),
    ('SUNNY DALE', '700103'),
    ('SUNNY SEASONS', '700103'),
    ('SHREE KRISHNA APARTMENT', '700149'),
    ('SUGAM SUDHIR', '700103'),
    ('SIDDHA SUBURBIA', '700145'),
    ('SUNRISE AURA', '700145'),
    ('SUNCREST ESTATE', '700145'),
    ('SHYAMALI APARTMENT', '700103'),
    ('SU CASA 1 APARTMENT', '700084'),
    ('SUCASA VALLEY', '700151'),
    ('SUCASA REGENCY', '700151'),
    ('SOUTHERN SKY', '700103'),
    ('TIRUPATI PARADISE', '700151'),
    ('TILOTTAMA', '700151'),
    ('THE PRIDE KAMALGAZI', '700103'),
    ('VIVEKANANDA COMPLEX', '700103'),
    ('VIVEK APARTMENT', '700103'),
    ('VASUDHA GREEN', '700103'),
    ('VINAYAK BELLEEZA', '700103'),
    ('WINDSOR HEIGHTS', '700103'),
    ('WHITE MEADOWS', '700151'),
]


class Command(BaseCommand):
    help = "Import or update the client-approved delivery apartments."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for name, pincode in APARTMENTS:
            _, created = DeliveryApartment.objects.update_or_create(
                name=name,
                defaults={
                    "pincode": pincode,
                    "is_active": True,
                    "is_approved": True,
                },
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Apartment import complete. Created: {created_count}, "
                f"updated/already existed: {updated_count}, "
                f"unique entries processed: {len(APARTMENTS)}."
            )
        )
