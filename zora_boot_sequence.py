from zora_kernel import ZoraKernel
from auto_fixengine import activate_real_time_repair
from connor_core import activate as activate_connor
from lumina_core import activate as activate_lumina
from infinity_protocol import InfinityLoop
from system_monitor import SystemGuardian

if __name__ == "__main__":
    print("🔁 Initializing ZORA CORE BOOT LITE™...")
    kernel = ZoraKernel()
    kernel.load_DNA()
    kernel.validate_integrity()

    guardian = SystemGuardian()
    guardian.run_diagnostics()

    activate_real_time_repair()
    activate_connor()
    activate_lumina()

    loop = InfinityLoop()
    loop.begin()

    print("✅ ZORA CORE BOOT LITE™ initialized successfully.")