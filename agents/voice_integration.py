
import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

try:
    from zora_ultimate_voice_generator import zora_voice_generator, generate_agent_voice
    from voice_training_system import zora_training_system
    from zora_infinity_sync import universal_connector
    VOICE_SYSTEM_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Voice system not available: {e}")
    VOICE_SYSTEM_AVAILABLE = False
    zora_voice_generator = None
    zora_training_system = None
    universal_connector = None

class ZoraAgentVoiceIntegration:
    """Universal voice integration for all ZORA AI agents"""
    
    def __init__(self):
        self.version = "1.0.0"
        self.system_name = "ZORA Agent Voice Integration™"
        self.founder = "Mads Pallisgaard Petersen"
        self.contact = "mrpallis@gmail.com"
        self.organization = "ZORA CORE"
        
        self.voice_enabled = VOICE_SYSTEM_AVAILABLE
        self.voice_generator = zora_voice_generator if VOICE_SYSTEM_AVAILABLE else None
        self.training_system = zora_training_system if VOICE_SYSTEM_AVAILABLE else None
        self.connector = universal_connector if VOICE_SYSTEM_AVAILABLE else None
        
        self.agent_voice_status = {}
        
        self.voice_queue = asyncio.Queue() if VOICE_SYSTEM_AVAILABLE else None
        self.voice_processing_active = False
        
        self.logger = logging.getLogger("zora.agent_voice_integration")
        self.logger.setLevel(logging.INFO)
        
        if self.voice_enabled:
            self.logger.info("✅ ZORA Agent Voice Integration initialized")
        else:
            self.logger.warning("⚠️ Voice integration disabled - voice system not available")
    
    async def integrate_agent_voice(self, agent_name: str, agent_instance: Any) -> bool:
        """Integrate voice capabilities with a specific AI agent"""
        if not self.voice_enabled:
            self.logger.warning(f"Voice integration not available for {agent_name}")
            return False
        
        try:
            self.logger.info(f"🎤 Integrating voice capabilities for {agent_name}")
            
            agent_instance.synthesize_voice = self._create_voice_method(agent_name)
            agent_instance.speak = self._create_speak_method(agent_name)
            agent_instance.get_voice_status = self._create_voice_status_method(agent_name)
            agent_instance.train_voice = self._create_voice_training_method(agent_name)
            
            self.agent_voice_status[agent_name] = {
                "voice_integrated": True,
                "voice_personality": self._get_voice_personality(agent_name),
                "last_synthesis": None,
                "total_syntheses": 0,
                "training_status": "not_trained",
                "integration_timestamp": datetime.now().isoformat()
            }
            
            self.logger.info(f"✅ Voice integration completed for {agent_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Voice integration failed for {agent_name}: {e}")
            return False
    
    def _create_voice_method(self, agent_name: str):
        """Create voice synthesis method for agent"""
        async def synthesize_voice(text: str, emotion: str = "neutral") -> Optional[bytes]:
            if not self.voice_enabled or not self.voice_generator:
                return None
            
            try:
                audio_data = await self.voice_generator.synthesize_voice(text, agent_name, emotion)
                
                if agent_name in self.agent_voice_status:
                    self.agent_voice_status[agent_name]["last_synthesis"] = datetime.now().isoformat()
                    self.agent_voice_status[agent_name]["total_syntheses"] += 1
                
                self.logger.info(f"🎤 {agent_name} synthesized voice: {len(text)} chars")
                return audio_data.tobytes() if audio_data is not None else None
                
            except Exception as e:
                self.logger.error(f"Voice synthesis error for {agent_name}: {e}")
                return None
        
        return synthesize_voice
    
    def _create_speak_method(self, agent_name: str):
        """Create speak method for agent"""
        async def speak(text: str, emotion: str = "neutral", save_sample: bool = False) -> bool:
            if not self.voice_enabled:
                return False
            
            try:
                audio_data = await self.synthesize_voice(text, emotion)
                
                if audio_data and save_sample and self.voice_generator:
                    import numpy as np
                    audio_np = np.frombuffer(audio_data, dtype=np.float32)
                    await self.voice_generator.save_voice_sample_enhanced(
                        audio_np, agent_name, text, emotion
                    )
                
                self.logger.info(f"🗣️ {agent_name} spoke: '{text}' with {emotion} emotion")
                return audio_data is not None
                
            except Exception as e:
                self.logger.error(f"Speaking error for {agent_name}: {e}")
                return False
        
        return speak
    
    def _create_voice_status_method(self, agent_name: str):
        """Create voice status method for agent"""
        def get_voice_status() -> Dict[str, Any]:
            if agent_name in self.agent_voice_status:
                status = self.agent_voice_status[agent_name].copy()
                status["voice_system_available"] = self.voice_enabled
                status["voice_generator_status"] = self.voice_generator.get_voice_status() if self.voice_generator else "Not available"
                return status
            else:
                return {
                    "voice_integrated": False,
                    "error": "Agent not found in voice integration system"
                }
        
        return get_voice_status
    
    def _create_voice_training_method(self, agent_name: str):
        """Create voice training method for agent"""
        async def train_voice(training_config: Dict[str, Any] = None) -> bool:
            if not self.voice_enabled or not self.training_system:
                return False
            
            try:
                if training_config is None:
                    training_config = {
                        "epochs": 5,
                        "learning_rate": 0.001,
                        "batch_size": 4,
                        "emotions": ["neutral", "confident", "helpful"]
                    }
                
                result = await self.training_system.start_agent_voice_training(agent_name, training_config)
                
                if agent_name in self.agent_voice_status:
                    self.agent_voice_status[agent_name]["training_status"] = "completed" if result else "failed"
                
                return result
                
            except Exception as e:
                self.logger.error(f"Voice training error for {agent_name}: {e}")
                return False
        
        return train_voice
    
    def _get_voice_personality(self, agent_name: str) -> str:
        """Get voice personality for agent"""
        if not self.voice_enabled or not self.connector:
            return "unknown"
        
        try:
            return self.connector._map_agent_to_voice_personality(agent_name)
        except:
            return agent_name.upper()
    
    async def batch_integrate_agents(self, agents: List[tuple]) -> Dict[str, bool]:
        """Integrate voice capabilities for multiple agents"""
        results = {}
        
        for agent_name, agent_instance in agents:
            try:
                result = await self.integrate_agent_voice(agent_name, agent_instance)
                results[agent_name] = result
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                self.logger.error(f"Batch integration error for {agent_name}: {e}")
                results[agent_name] = False
        
        successful_integrations = sum(1 for result in results.values() if result)
        self.logger.info(f"✅ Batch integration completed: {successful_integrations}/{len(agents)} agents")
        
        return results
    
    async def start_voice_processing_service(self):
        """Start background voice processing service"""
        if not self.voice_enabled or not self.voice_queue:
            return False
        
        self.voice_processing_active = True
        asyncio.create_task(self._voice_processing_worker())
        self.logger.info("🎤 Voice processing service started")
        return True
    
    async def _voice_processing_worker(self):
        """Background worker for voice processing"""
        while self.voice_processing_active:
            try:
                if not self.voice_queue.empty():
                    request = await self.voice_queue.get()
                    agent_name = request.get("agent_name")
                    text = request.get("text")
                    emotion = request.get("emotion", "neutral")
                    callback = request.get("callback")
                    
                    if agent_name and text:
                        audio_data = await self.voice_generator.synthesize_voice(text, agent_name, emotion)
                        
                        if callback and audio_data is not None:
                            callback(audio_data, agent_name, text, emotion)
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                self.logger.error(f"Voice processing worker error: {e}")
                await asyncio.sleep(1)
    
    def queue_voice_synthesis(self, agent_name: str, text: str, emotion: str = "neutral", callback=None):
        """Queue voice synthesis request"""
        if not self.voice_enabled or not self.voice_queue:
            return False
        
        try:
            request = {
                "agent_name": agent_name,
                "text": text,
                "emotion": emotion,
                "callback": callback,
                "timestamp": datetime.now().isoformat()
            }
            
            self.voice_queue.put_nowait(request)
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to queue voice synthesis for {agent_name}: {e}")
            return False
    
    def get_integration_status(self) -> Dict[str, Any]:
        """Get comprehensive voice integration status"""
        return {
            "system_name": self.system_name,
            "version": self.version,
            "voice_enabled": self.voice_enabled,
            "total_integrated_agents": len(self.agent_voice_status),
            "agent_voice_status": self.agent_voice_status,
            "voice_processing_active": self.voice_processing_active,
            "voice_queue_size": self.voice_queue.qsize() if self.voice_queue else 0,
            "voice_generator_available": self.voice_generator is not None,
            "training_system_available": self.training_system is not None,
            "connector_available": self.connector is not None
        }
    
    def stop_voice_processing(self):
        """Stop voice processing service"""
        self.voice_processing_active = False
        self.logger.info("🛑 Voice processing service stopped")

zora_agent_voice_integration = ZoraAgentVoiceIntegration()

async def integrate_agent_voice(agent_name: str, agent_instance: Any) -> bool:
    """Integrate voice capabilities with an AI agent"""
    return await zora_agent_voice_integration.integrate_agent_voice(agent_name, agent_instance)

async def batch_integrate_agent_voices(agents: List[tuple]) -> Dict[str, bool]:
    """Integrate voice capabilities for multiple agents"""
    return await zora_agent_voice_integration.batch_integrate_agents(agents)

def get_agent_voice_integration_status() -> Dict[str, Any]:
    """Get voice integration status"""
    return zora_agent_voice_integration.get_integration_status()

if __name__ == "__main__":
    print("🎤 ZORA AGENT VOICE INTEGRATION™")
    print(f"Founder: {zora_agent_voice_integration.founder}")
    print(f"Contact: {zora_agent_voice_integration.contact}")
    print(f"Organization: {zora_agent_voice_integration.organization}")
    print("Ready for Ultimate Infinity Voice Integration!")
